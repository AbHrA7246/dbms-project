import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PackagePlus,
  CheckCircle2,
  ArrowRight,
  Info,
  MapPin,
  Truck,
  AlertCircle,
  AlertTriangle,
  Phone,
  User,
  Mail,
  Building2,
  Clock,
  Compass,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDirectory } from '../context/DirectoryContext';
import { storageService, isCentreEligibleForRequest, checkRequestFeasibility, validateServiceArea } from '../services/storageService';
import {
  geocodeAddress,
  formatCoordinates,
  calculateHaversineDistanceKm,
  formatDistanceKm,
  isValidCoordinate,
} from '../services/geocodingService';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, addUserRequest, getUserAddresses } = useAuth();
  const { openDirectory } = useDirectory();

  const [centres, setCentres] = useState(() => storageService.getCentres());
  const [submitted, setSubmitted] = useState(false);
  const [createdRequest, setCreatedRequest] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedSavedAddrId, setSelectedSavedAddrId] = useState('');
  const [showAllCentres, setShowAllCentres] = useState(false);
  const [geocodingStatus, setGeocodingStatus] = useState('idle'); // 'idle' | 'loading' | 'verified' | 'unconfigured' | 'not_found' | 'error'
  const [geocodedCoordinates, setGeocodedCoordinates] = useState(null);
  const [geocodingFeedback, setGeocodingFeedback] = useState('');
  const [suggestedAddress, setSuggestedAddress] = useState('');

  useEffect(() => {
    if (user?.email && getUserAddresses) {
      const addrs = getUserAddresses();
      setSavedAddresses(addrs);
      const def = addrs.find((a) => a.isDefault) || addrs[0];
      if (def) {
        setSelectedSavedAddrId(def.id);
        if (def.coordinates && isValidCoordinate(def.coordinates.latitude, def.coordinates.longitude)) {
          setGeocodedCoordinates(def.coordinates);
          setGeocodingStatus('verified');
          setGeocodingFeedback(`Coordinates: ${formatCoordinates(def.coordinates)}`);
        }
      }
    }
  }, [user]);

  const [formData, setFormData] = useState({
    category: 'computing',
    brand: '',
    model: '',
    condition: 'working',
    quantity: '1',
    weight: '1.5',
    method: 'dropoff',
    customerName: user?.name || '',
    customerPhone: user?.phone || '',
    address: '',
    centerId: '',
    center: '',
    notes: '',
  });

  // Sync available registered centres from storage
  useEffect(() => {
    const updateCentres = () => {
      const list = storageService.getCentres();
      setCentres(list);
    };

    updateCentres();
    window.addEventListener('storage', updateCentres);
    window.addEventListener('ecocycle_storage_update', updateCentres);
    return () => {
      window.removeEventListener('storage', updateCentres);
      window.removeEventListener('ecocycle_storage_update', updateCentres);
    };
  }, []);

  // Compute eligible centres matching requested waste category and service type
  const eligibleCentres = useMemo(() => {
    return centres.filter((c) =>
      isCentreEligibleForRequest(c, {
        category: formData.category,
        method: formData.method,
      })
    );
  }, [centres, formData.category, formData.method]);

  // Active customer coordinates (from pickup address geocoding, selected saved address, or default saved address)
  const activeCustomerCoords = useMemo(() => {
    if (geocodedCoordinates && isValidCoordinate(geocodedCoordinates.latitude, geocodedCoordinates.longitude)) {
      return geocodedCoordinates;
    }
    const selected = savedAddresses.find((a) => a.id === selectedSavedAddrId);
    if (selected?.coordinates && isValidCoordinate(selected.coordinates.latitude, selected.coordinates.longitude)) {
      return selected.coordinates;
    }
    const def = savedAddresses.find((a) => a.isDefault);
    if (def?.coordinates && isValidCoordinate(def.coordinates.latitude, def.coordinates.longitude)) {
      return def.coordinates;
    }
    return null;
  }, [geocodedCoordinates, selectedSavedAddrId, savedAddresses]);

  // Compute eligible centres with straight-line Haversine distance and sort ascending
  const sortedEligibleCentres = useMemo(() => {
    const list = eligibleCentres.map((centre) => {
      let distanceKm = null;
      if (
        activeCustomerCoords &&
        centre.coordinates &&
        isValidCoordinate(centre.coordinates.latitude, centre.coordinates.longitude)
      ) {
        distanceKm = calculateHaversineDistanceKm(activeCustomerCoords, centre.coordinates);
      }
      return {
        ...centre,
        distanceKm,
      };
    });

    if (activeCustomerCoords && list.some((c) => c.distanceKm !== null)) {
      return list.sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm !== null) return -1;
        if (b.distanceKm !== null) return 1;
        return 0;
      });
    }

    return list;
  }, [eligibleCentres, activeCustomerCoords]);

  const hasDistanceCoordinates = Boolean(
    activeCustomerCoords && sortedEligibleCentres.some((c) => c.distanceKm !== null)
  );

  const displayedCentres = useMemo(() => {
    if (showAllCentres || !hasDistanceCoordinates) {
      return sortedEligibleCentres;
    }
    return sortedEligibleCentres.slice(0, 3);
  }, [sortedEligibleCentres, showAllCentres, hasDistanceCoordinates]);

  // Synchronize selection: ensure selected facility is an eligible centre
  useEffect(() => {
    if (sortedEligibleCentres.length > 0) {
      const stillValid = sortedEligibleCentres.some((c) => c.id === formData.centerId);
      if (!stillValid) {
        setFormData((prev) => ({
          ...prev,
          centerId: sortedEligibleCentres[0].id,
          center: sortedEligibleCentres[0].name,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        centerId: '',
        center: '',
      }));
    }
  }, [sortedEligibleCentres, formData.centerId]);

  // Selected centre object
  const selectedCentre = useMemo(() => {
    return sortedEligibleCentres.find((c) => c.id === formData.centerId) || null;
  }, [sortedEligibleCentres, formData.centerId]);

  // Feasibility of the current declaration against the selected facility
  const centreFeasibility = useMemo(() => {
    if (!selectedCentre || !formData.weight || !formData.quantity) return { feasible: true };
    return checkRequestFeasibility(selectedCentre, {
      weight: formData.weight,
      quantity: formData.quantity,
    });
  }, [selectedCentre, formData.weight, formData.quantity]);

  // Service area advisory for pickup requests against the selected facility
  const serviceAreaAdvisory = useMemo(() => {
    if (formData.method !== 'pickup' || !selectedCentre || !formData.address) return null;
    return validateServiceArea(selectedCentre, formData.address);
  }, [formData.method, selectedCentre, formData.address]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'centerId') {
      const selected = eligibleCentres.find((c) => c.id === value);
      setFormData((prev) => ({
        ...prev,
        centerId: value,
        center: selected ? selected.name : value,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (name === 'address') {
      setGeocodedCoordinates(null);
      setGeocodingStatus('idle');
      setGeocodingFeedback('');
      setSuggestedAddress('');
    }
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (name === 'weight' || name === 'quantity' || name === 'centerId') {
      if (formErrors.center) {
        setFormErrors((prev) => ({ ...prev, center: '' }));
      }
    }
  };

  const handleLookupAddress = async () => {
    if (!formData.address || formData.address.trim().length < 3) {
      setGeocodingStatus('error');
      setGeocodingFeedback('Please enter an address before verifying location.');
      return;
    }
    setGeocodingStatus('loading');
    setGeocodingFeedback('');
    try {
      const res = await geocodeAddress(formData.address);
      if (res.success && res.data) {
        setGeocodingStatus('verified');
        setGeocodedCoordinates(res.data);
        setGeocodingFeedback(`Coordinates verified: ${formatCoordinates(res.data)}`);
        if (res.data.formattedAddress && res.data.formattedAddress.toLowerCase() !== formData.address.trim().toLowerCase()) {
          setSuggestedAddress(res.data.formattedAddress);
        } else {
          setSuggestedAddress('');
        }
      } else if (res.status === 'unconfigured') {
        setGeocodingStatus('unconfigured');
        setGeocodingFeedback('Geocoding service inactive (API key not configured). Manual address will be used.');
        setGeocodedCoordinates(null);
      } else {
        setGeocodingStatus(res.status || 'error');
        setGeocodingFeedback(res.message || 'Could not verify exact coordinates.');
        setGeocodedCoordinates(null);
      }
    } catch {
      setGeocodingStatus('error');
      setGeocodingFeedback('Geocoding lookup failed. Manual address will be used.');
      setGeocodedCoordinates(null);
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.brand.trim()) {
      errors.brand = 'Brand / Manufacturer is required.';
    }
    if (!formData.model.trim()) {
      errors.model = 'Model name or number is required.';
    }

    // Strict quantity validation: positive whole number between 1 and 1,000 units
    const rawQty = typeof formData.quantity === 'string' ? formData.quantity.trim() : String(formData.quantity ?? '');
    if (!rawQty) {
      errors.quantity = 'Quantity is required and must be at least 1 unit.';
    } else if (!/^\d+$/.test(rawQty)) {
      errors.quantity = 'Quantity must be a positive whole number (e.g. 1, 5, 20). Decimals and non-numeric characters are not allowed.';
    } else {
      const qty = Number(rawQty);
      if (qty < 1) {
        errors.quantity = 'Quantity must be at least 1 unit.';
      } else if (qty > 1000) {
        errors.quantity = 'Quantity cannot exceed 1,000 units per single declaration. For larger corporate dispatches, please submit separate batches.';
      }
    }

    // Strict weight validation: positive number up to 2 decimal places, between 0.01 and 5,000 kg
    const rawWt = typeof formData.weight === 'string' ? formData.weight.trim() : String(formData.weight ?? '');
    if (!rawWt) {
      errors.weight = 'Approximate weight is required.';
    } else if (!/^\d+(\.\d+)?$/.test(rawWt)) {
      errors.weight = 'Weight must be a valid positive number in kilograms (e.g. 0.25, 1.75, 12.35). Non-numeric characters are not allowed.';
    } else {
      const parts = rawWt.split('.');
      if (parts[1] && parts[1].length > 2) {
        errors.weight = 'Weight supports up to two decimal places of precision (e.g. 0.25 kg).';
      } else {
        const wt = Number(rawWt);
        if (!Number.isFinite(wt) || wt <= 0) {
          errors.weight = 'Approximate weight must be greater than 0 kg.';
        } else if (wt > 5000) {
          errors.weight = 'Weight cannot exceed 5,000 kg per declaration. For bulk logistics exceeding 5 metric tonnes, please arrange dedicated freight dispatches.';
        }
      }
    }

    if (!formData.customerName.trim()) {
      errors.customerName = 'Contact name is required.';
    }
    if (!formData.customerPhone.trim() || formData.customerPhone.trim().length < 6) {
      errors.customerPhone = 'A valid contact phone number is required.';
    }
    if (eligibleCentres.length === 0 || !formData.centerId) {
      errors.center = 'No recommended centres available.';
    } else if (selectedCentre && !errors.weight && !errors.quantity) {
      // Single-slot capacity feasibility check
      const feasibility = checkRequestFeasibility(selectedCentre, {
        weight: formData.weight,
        quantity: formData.quantity,
      });
      if (!feasibility.feasible) {
        errors.center = feasibility.reason;
      }
    }

    if (formData.method === 'pickup' && (!formData.address || formData.address.trim().length < 5)) {
      errors.address = 'Please provide a full pickup address (street, building/room, city).';
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaveError('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const assignedCentre = eligibleCentres.find((c) => c.id === formData.centerId) || eligibleCentres[0];

      if (!assignedCentre) {
        throw new Error('Please select an eligible recycling facility.');
      }

      const saved = addUserRequest({
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        category: formData.category,
        condition: formData.condition,
        quantity: Number(formData.quantity),
        weight: Number(Number(formData.weight).toFixed(2)),
        method: formData.method,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        address:
          formData.method === 'pickup'
            ? formData.address.trim()
            : (assignedCentre && assignedCentre.address
                ? `${assignedCentre.name} — ${assignedCentre.address}, ${assignedCentre.city} (${assignedCentre.hours || '09:00 AM – 05:00 PM'})`
                : `${assignedCentre.name} Drop-off Kiosk`),
        dropoffFacilityAddress: assignedCentre?.address || '',
        dropoffFacilityCity: assignedCentre?.city || '',
        dropoffFacilityHours: assignedCentre?.hours || '',
        center: assignedCentre.name,
        centreId: assignedCentre.id,
        notes: formData.notes.trim(),
        coordinates: geocodedCoordinates || null,
      });

      setCreatedRequest(saved);
      setSubmitted(true);
    } catch (err) {
      setSaveError(err.message || 'Failed to save e-waste registration. Please try again.');
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto page-enter text-charcoal dark:text-[#F5F5F5]">

      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
            Register E-Waste Item
          </h1>
          <span className="text-xs font-mono text-gray-500 dark:text-[#B8BDC3] bg-gray-100 dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] px-2.5 py-1 rounded">
            Account: {user?.email}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-[#B8BDC3]">
          Declare surplus electronic hardware for authorized facility drop-off or doorstep collection.
        </p>
      </div>

      {saveError && (
        <div className="mb-6 p-3.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {submitted && createdRequest ? (
        <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-charcoal dark:text-[#F5F5F5]">
              E-Waste Declaration Saved
            </h2>
            <p className="text-sm text-gray-600 dark:text-[#B8BDC3]">
              Your declaration has been registered with assigned tracking ID:
            </p>
            <div className="font-mono font-bold text-lg text-forest dark:text-[#FF7028] bg-forest-50 dark:bg-[#202326] py-1.5 px-4 rounded-md inline-block border border-forest-200 dark:border-[#3A3E43] mt-2">
              #{createdRequest.id}
            </div>
          </div>

          <div className="bg-offwhite dark:bg-[#202326] rounded-lg p-5 text-left text-xs space-y-2.5 border border-gray-200 dark:border-[#3A3E43] max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-[#B8BDC3]">Hardware:</span>
              <strong className="text-charcoal dark:text-[#F5F5F5] font-semibold">{createdRequest.items}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-[#B8BDC3]">Declared Quantity:</span>
              <span className="text-charcoal dark:text-[#F5F5F5] font-medium">{createdRequest.quantity} unit(s) • ~{createdRequest.weight} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-[#B8BDC3]">Collection Channel:</span>
              <span className="text-charcoal dark:text-[#F5F5F5] font-medium">{createdRequest.channel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-[#B8BDC3]">Assigned Facility:</span>
              <span className="text-charcoal dark:text-[#F5F5F5] font-medium">{createdRequest.center}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-[#B8BDC3]">Submission Date:</span>
              <span className="text-charcoal dark:text-[#F5F5F5] font-medium">{createdRequest.date}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/requests"
              className="btn-primary text-sm px-6 py-2.5 shadow-sm"
            >
              <span>View in My Requests</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/dashboard"
              className="btn-secondary text-sm px-6 py-2.5"
            >
              Return to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setCreatedRequest(null);
                setFormData({
                  category: 'computing',
                  brand: '',
                  model: '',
                  condition: 'working',
                  quantity: '1',
                  weight: '1.5',
                  method: 'dropoff',
                  address: '',
                  centerId: centres[0]?.id || '',
                  center: centres[0]?.name || '',
                  notes: '',
                });
              }}
              className="text-xs text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] underline"
            >
              Register Another Item
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">

          {/* Section 1: Device Specs */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5] pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
              1. Equipment Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                  Device Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
                >
                  <option value="computing" className="dark:bg-[#202326]">Computers &amp; Laptops</option>
                  <option value="mobile" className="dark:bg-[#202326]">Smartphones &amp; Tablets</option>
                  <option value="battery" className="dark:bg-[#202326]">Batteries &amp; Power Units</option>
                  <option value="peripherals" className="dark:bg-[#202326]">Cables &amp; Peripherals</option>
                  <option value="appliances" className="dark:bg-[#202326]">Home &amp; Office Electronics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                  Brand / Manufacturer *
                </label>
                <input
                  type="text"
                  name="brand"
                  placeholder="e.g. Dell, Apple, Lenovo, HP"
                  value={formData.brand}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] ${
                    formErrors.brand ? 'border-red-400 dark:border-red-600/80 bg-red-50/30 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43]'
                  }`}
                />
                {formErrors.brand && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.brand}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                  Model / Hardware Specification *
                </label>
                <input
                  type="text"
                  name="model"
                  placeholder="e.g. Latitude 5420, iPhone 11, ThinkPad T490"
                  value={formData.model}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] ${
                    formErrors.model ? 'border-red-400 dark:border-red-600/80 bg-red-50/30 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43]'
                  }`}
                />
                {formErrors.model && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.model}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                  Operating Condition
                </label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
                >
                  <option value="working" className="dark:bg-[#202326]">Functional / Working (Refurbishable)</option>
                  <option value="partial" className="dark:bg-[#202326]">Partially Working / Minor Defects</option>
                  <option value="broken" className="dark:bg-[#202326]">Non-Functional / Scrap Materials</option>
                  <option value="harvest" className="dark:bg-[#202326]">Stripped for Component Harvest</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                  Quantity (Units) *
                </label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  max="1000"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] ${
                    formErrors.quantity ? 'border-red-400 dark:border-red-600/80 bg-red-50/30 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43]'
                  }`}
                />
                {formErrors.quantity ? (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.quantity}</span>
                ) : (
                  <span className="text-[10px] text-gray-500 dark:text-[#B8BDC3] mt-1 block">Whole units (1 to 1,000)</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                  Approximate Total Mass (kg) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="5000"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] ${
                    formErrors.weight ? 'border-red-400 dark:border-red-600/80 bg-red-50/30 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43]'
                  }`}
                />
                {formErrors.weight ? (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.weight}</span>
                ) : (
                  <span className="text-[10px] text-gray-500 dark:text-[#B8BDC3] mt-1 block">Supports 2 decimal places (up to 5,000 kg)</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Channel & Facility */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5] pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
              2. Disposal Channel &amp; Designated Facility
            </h3>

            {/* Service Type Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                  formData.method === 'dropoff'
                    ? 'border-forest dark:border-[#FF7028] bg-forest-50/50 dark:bg-[#202326] ring-1 ring-forest/30 dark:ring-[#FF7028]/30'
                    : 'border-gray-200 dark:border-[#3A3E43] hover:border-gray-300 dark:hover:border-[#FF7028]/50 bg-white dark:bg-[#202326]'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value="dropoff"
                  checked={formData.method === 'dropoff'}
                  onChange={handleChange}
                  className="mt-0.5 text-forest focus:ring-forest"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-charcoal dark:text-[#F5F5F5]">
                    <MapPin className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                    <span>Drop-off at Center</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">
                    Self-deliver directly to the verified recycling depot.
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                  formData.method === 'pickup'
                    ? 'border-forest dark:border-[#FF7028] bg-forest-50/50 dark:bg-[#202326] ring-1 ring-forest/30 dark:ring-[#FF7028]/30'
                    : 'border-gray-200 dark:border-[#3A3E43] hover:border-gray-300 dark:hover:border-[#FF7028]/50 bg-white dark:bg-[#202326]'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value="pickup"
                  checked={formData.method === 'pickup'}
                  onChange={handleChange}
                  className="mt-0.5 text-forest focus:ring-forest"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-charcoal dark:text-[#F5F5F5]">
                    <Truck className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                    <span>Schedule Doorstep Pickup</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">
                    Authorized courier collects hardware from your street address.
                  </p>
                </div>
              </label>
            </div>

            {/* Facility Selector: Filtered by Category & Service Type */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5]">
                  Select Registered Recycling Facility *
                </label>
                {eligibleCentres.length > 0 && (
                  <span className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                    {hasDistanceCoordinates
                      ? `${sortedEligibleCentres.length} eligible (${showAllCentres ? 'showing all' : `top ${Math.min(3, sortedEligibleCentres.length)} nearest`})`
                      : `${eligibleCentres.length} eligible ${eligibleCentres.length === 1 ? 'facility' : 'facilities'}`}
                  </span>
                )}
              </div>

              {eligibleCentres.length === 0 ? (
                <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] text-xs text-gray-500 dark:text-[#B8BDC3] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>No recommended centres available.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Distance Proximity Header or Fallback Notice */}
                  {hasDistanceCoordinates ? (
                    <div className="p-2.5 rounded-lg bg-forest-50/70 dark:bg-[#202326] border border-forest-200/80 dark:border-[#3A3E43] text-xs text-forest-900 dark:text-[#F5F5F5] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-forest dark:text-[#FF7028] shrink-0" />
                        <span className="font-semibold">Nearest Facilities:</span>
                        <span>Ranked by straight-line Haversine distance from your location</span>
                      </div>
                      {sortedEligibleCentres.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setShowAllCentres(!showAllCentres)}
                          className="font-bold underline text-xs text-forest dark:text-[#FF7028] shrink-0 cursor-pointer hover:text-forest-700"
                        >
                          {showAllCentres ? 'Show top 3 nearest only' : `View all ${sortedEligibleCentres.length} facilities`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] text-xs text-gray-600 dark:text-[#B8BDC3] flex items-center gap-2">
                      <Info className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>
                        Distance-based sorting is unavailable (no verified location coordinates). Registered facilities are listed below.
                      </span>
                    </div>
                  )}

                  {/* Nearest / Eligible Facility Shortlist Cards */}
                  <div className="space-y-2">
                    {displayedCentres.map((c) => {
                      const isSelected = formData.centerId === c.id;
                      return (
                        <label
                          key={c.id}
                          className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-forest dark:border-[#FF7028] bg-forest-50/60 dark:bg-[#202326] ring-1 ring-forest/30 dark:ring-[#FF7028]/30 shadow-2xs'
                              : 'border-gray-200 dark:border-[#3A3E43] hover:border-gray-300 dark:hover:border-[#FF7028]/50 bg-white dark:bg-[#202326]'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="radio"
                              name="centerId"
                              value={c.id}
                              checked={isSelected}
                              onChange={handleChange}
                              className="mt-1 text-forest focus:ring-forest"
                            />
                            <div className="space-y-0.5">
                              <div className="font-semibold text-sm text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
                                <span>{c.name}</span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-[#B8BDC3] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span>{c.address ? `${c.address}, ` : ''}{c.city}</span>
                                <span>•</span>
                                <span>{c.operatingDays || 'Mon-Fri'}</span>
                                <span>•</span>
                                <span>{c.hours || '09:00 AM – 05:00 PM'}</span>
                              </div>
                              {c.serviceArea && c.serviceArea !== c.city && (
                                <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                                  Service Area: {c.serviceArea}
                                </div>
                              )}
                            </div>
                          </div>

                          {c.distanceKm !== null && (
                            <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#202326] text-gray-700 dark:text-[#F5F5F5] border border-gray-200 dark:border-[#3A3E43]">
                              {formatDistanceKm(c.distanceKm)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {/* Fallback / Quick Dropdown Selector */}
                  <div className="pt-1">
                    <label className="text-[11px] text-gray-500 dark:text-[#B8BDC3] block mb-1">
                      Quick dropdown selector:
                    </label>
                    <select
                      name="centerId"
                      value={formData.centerId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-[#3A3E43] rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5]"
                    >
                      {sortedEligibleCentres.map((c) => (
                        <option key={c.id} value={c.id} className="dark:bg-[#202326]">
                          {c.name} — {c.city} ({c.operatingDays || 'Mon-Fri'}){c.distanceKm !== null ? ` [${formatDistanceKm(c.distanceKm)}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3] mt-1">
                    Scoped routing: This request will be routed directly to the selected facility. No other facilities receive actionable access.
                  </p>
                </div>
              )}
              {formErrors.center && (
                <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.center}</span>
              )}

              {/* Feasibility Warning Banner if Declaration Exceeds Facility Single-Slot Capacity */}
              {!centreFeasibility.feasible && (
                <div className="mt-3 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Declaration Exceeds Facility Intake Capacity</span>
                      <p className="text-[11px] leading-relaxed mt-0.5">
                        {centreFeasibility.reason}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 pl-6">
                    💡 Single e-waste declarations cannot be split across appointment slots. You may reduce the declared quantity/weight or select another facility that supports larger dispatches.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Contact & Fulfillment Logistics */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5] pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
              3. Contact &amp; Intake Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
                  <span>Contact Full Name *</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  placeholder="e.g. Jane Doe"
                  value={formData.customerName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] ${
                    formErrors.customerName ? 'border-red-400 dark:border-red-600/80 bg-red-50/30 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43]'
                  }`}
                />
                {formErrors.customerName && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.customerName}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
                  <span>Contact Phone Number *</span>
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  placeholder="e.g. +1 (555) 234-5678"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] ${
                    formErrors.customerPhone ? 'border-red-400 dark:border-red-600/80 bg-red-50/30 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43]'
                  }`}
                />
                {formErrors.customerPhone && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.customerPhone}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>Account Email (Verified)</span>
              </label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#3A3E43] rounded-md bg-gray-50 dark:bg-[#202326] text-gray-600 dark:text-[#B8BDC3] font-mono text-xs cursor-not-allowed"
              />
            </div>

            {formData.method === 'pickup' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
                    <span>Doorstep Courier Pickup Street Address *</span>
                  </label>
                  {savedAddresses.length > 0 && (
                    <Link
                      to="/settings?tab=addresses"
                      className="text-[11px] text-forest dark:text-[#FF7028] hover:underline"
                    >
                      Manage Address Book
                    </Link>
                  )}
                </div>

                {savedAddresses.length > 0 && (
                  <div className="p-3 bg-forest-50/60 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] rounded-lg space-y-2">
                    <span className="text-[11px] font-semibold text-forest-900 dark:text-[#FF7028] block">
                      Choose from saved addresses:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedSavedAddrId === addr.id;
                        return (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => {
                              setSelectedSavedAddrId(addr.id);
                              const fullAddr = `${addr.addressLine}, ${addr.city}, ${addr.state || ''} ${addr.postalCode || ''}`.trim();
                              setFormData((prev) => ({
                                ...prev,
                                address: fullAddr,
                                notes: addr.pickupInstructions ? `${prev.notes ? prev.notes + ' | ' : ''}Pickup: ${addr.pickupInstructions}` : prev.notes,
                              }));
                              if (addr.coordinates && isValidCoordinate(addr.coordinates.latitude, addr.coordinates.longitude)) {
                                setGeocodedCoordinates(addr.coordinates);
                                setGeocodingStatus('verified');
                                setGeocodingFeedback(`Coordinates: ${formatCoordinates(addr.coordinates)}`);
                              } else {
                                setGeocodedCoordinates(null);
                                setGeocodingStatus('idle');
                                setGeocodingFeedback('');
                              }
                              if (formErrors.address) {
                                setFormErrors((prev) => ({ ...prev, address: '' }));
                              }
                            }}
                            className={`text-left p-2.5 rounded-md border text-xs transition-colors ${
                              isSelected
                                ? 'bg-white dark:bg-[#292D31] border-forest dark:border-[#FF7028] ring-1 ring-forest/30 dark:ring-[#FF7028]/30 shadow-2xs'
                                : 'bg-white/80 dark:bg-[#202326] border-gray-200 dark:border-[#3A3E43] hover:border-gray-300 dark:hover:border-[#FF7028]/50'
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold text-charcoal dark:text-[#F5F5F5]">
                              <span>{addr.label || 'Saved Address'}</span>
                              {addr.isDefault && (
                                <span className="text-[9px] font-bold bg-[#FFF3EB] dark:bg-[#FF7028]/15 text-[#B83A05] dark:text-[#FF7028] border border-[#FFE6D5] dark:border-[#FF7028]/30 px-1.5 py-0.2 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-600 dark:text-[#B8BDC3] truncate mt-0.5">
                              {addr.addressLine}, {addr.city}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  name="address"
                  placeholder="Building name, department / room, street address, city"
                  value={formData.address}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] ${
                    formErrors.address ? 'border-red-400 dark:border-red-600/80 bg-red-50/30 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43]'
                  }`}
                />
                {formErrors.address && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.address}</span>
                )}

                {/* Geocoding Location Verification Section */}
                <div className="pt-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLookupAddress}
                      disabled={geocodingStatus === 'loading' || !formData.address || formData.address.trim().length < 3}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-forest-600/40 dark:border-[#FF7028]/60 text-forest-700 dark:text-[#FF7028] bg-forest-50/50 dark:bg-[#202326] hover:bg-forest-100/60 dark:hover:bg-[#FF7028]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{geocodingStatus === 'loading' ? 'Verifying coordinates...' : 'Verify Address Coordinates'}</span>
                    </button>

                    {geocodingStatus === 'verified' && geocodedCoordinates && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Coordinates: {formatCoordinates(geocodedCoordinates)} (Geoapify)</span>
                      </span>
                    )}

                    {geocodingStatus === 'unconfigured' && (
                      <span className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                        Geocoding inactive (API key unconfigured). Manual address accepted.
                      </span>
                    )}

                    {(geocodingStatus === 'not_found' || geocodingStatus === 'error' || geocodingStatus === 'rate_limited') && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400">
                        {geocodingFeedback || 'Unable to resolve coordinates. Manual address will be used.'}
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
                          setFormData((prev) => ({ ...prev, address: suggestedAddress }));
                          setSuggestedAddress('');
                        }}
                        className="shrink-0 px-2.5 py-1 text-[11px] font-semibold bg-forest dark:bg-[#FF7028] text-white rounded hover:bg-forest-700 dark:hover:bg-[#F45D16] transition-colors shadow-2xs"
                      >
                        Use Suggestion
                      </button>
                    </div>
                  )}
                </div>

                {formData.address.trim().length >= 5 && serviceAreaAdvisory && !serviceAreaAdvisory.inArea && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs space-y-1 animate-fadeIn">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Service Area Advisory</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {serviceAreaAdvisory.message}
                    </p>
                  </div>
                )}
              </div>
            )}

            {formData.method === 'dropoff' && selectedCentre && (
              <div className="p-4 rounded-lg bg-[#FFF3EB] dark:bg-[#202326] border border-[#FFE6D5] dark:border-[#3A3E43] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5]">
                      Designated Facility Drop-Off Depot
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFE6D5] dark:bg-[#FF7028]/20 text-[#B83A05] dark:text-[#FF7028] border border-[#FECCA9] dark:border-[#FF7028]/30">
                    Self Walk-In
                  </span>
                </div>
                <div className="text-xs space-y-1 text-charcoal dark:text-[#F5F5F5]">
                  <div className="font-semibold text-sm">
                    {selectedCentre.name}
                  </div>
                  <div className="text-gray-600 dark:text-[#B8BDC3] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-forest dark:text-[#FF7028] shrink-0" />
                    <span>{selectedCentre.address}, {selectedCentre.city}</span>
                  </div>
                  <div className="text-gray-500 dark:text-[#B8BDC3] flex items-center gap-1.5 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Operating Hours: {selectedCentre.hours || '09:00 AM – 05:00 PM'} ({selectedCentre.operatingDays || 'Monday to Friday'})</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                Additional Notes / Serial Numbers (Optional)
              </label>
              <textarea
                name="notes"
                rows="2"
                placeholder="Optional notes regarding battery condition, packaging status, or gate access instructions."
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-gray-100 dark:border-[#3A3E43] flex items-center justify-between">
            <Link
              to="/centers"
              onClick={(e) => {
                e.preventDefault();
                openDirectory('Registration Form');
              }}
              className="text-xs text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] underline"
            >
              Browse verified centers directory
            </Link>

            <button
              type="submit"
              disabled={eligibleCentres.length === 0}
              className={`btn-primary text-sm px-6 py-2.5 font-semibold shadow-sm flex items-center gap-2 ${
                eligibleCentres.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <PackagePlus className="w-4 h-4" />
              <span>Submit Registration</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
