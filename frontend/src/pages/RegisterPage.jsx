import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PackagePlus,
  CheckCircle2,
  ArrowRight,
  Info,
  MapPin,
  Truck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, addUserRequest } = useAuth();

  const [submitted, setSubmitted] = useState(false);
  const [createdRequest, setCreatedRequest] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState('');

  const [formData, setFormData] = useState({
    category: 'computing',
    brand: '',
    model: '',
    condition: 'working',
    quantity: '1',
    weight: '1.5',
    method: 'dropoff',
    address: '',
    center: 'Metro GreenTech Recycling Hub',
    notes: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
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
    const qty = parseInt(formData.quantity, 10);
    if (isNaN(qty) || qty < 1) {
      errors.quantity = 'Quantity must be at least 1 unit.';
    }
    const wt = parseFloat(formData.weight);
    if (isNaN(wt) || wt <= 0) {
      errors.weight = 'Approximate weight must be greater than 0 kg.';
    }
    if (formData.method === 'pickup' && (!formData.address || formData.address.trim().length < 5)) {
      errors.address = 'Please provide a full pickup address (street, building/room).';
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
      // Save directly to the temporary persistence layer via storageService
      const saved = addUserRequest({
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        category: formData.category,
        condition: formData.condition,
        quantity: parseInt(formData.quantity, 10),
        weight: parseFloat(formData.weight),
        method: formData.method,
        address: formData.method === 'pickup' ? formData.address.trim() : 'Self Drop-off at Center Kiosk',
        center: formData.center,
        notes: formData.notes.trim(),
      });

      // Show success only after write successfully completes
      setCreatedRequest(saved);
      setSubmitted(true);
    } catch (err) {
      setSaveError(err.message || 'Failed to save e-waste registration. Please try again.');
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto page-enter">

      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal">
            Register E-Waste Item
          </h1>
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2.5 py-1 rounded">
            Account: {user?.email}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          Declare surplus electronic hardware for authorized facility drop-off or doorstep collection.
        </p>

        {/* Temporary Storage Notice */}
        <div className="p-3.5 rounded-md bg-forest-50 border border-forest-100 text-forest-900 text-xs flex items-start gap-2.5 mt-4">
          <Info className="w-4 h-4 text-forest shrink-0 mt-0.5" />
          <div>
            <strong>Temporary Persistence Notice:</strong> Your submissions are validated and saved to browser localStorage via an isolated storage service. This data layer is decoupled to allow drop-in replacement with an Oracle Database backend in a future release.
          </div>
        </div>
      </div>

      {saveError && (
        <div className="mb-6 p-3.5 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {submitted && createdRequest ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-charcoal">
              E-Waste Declaration Saved
            </h2>
            <p className="text-sm text-gray-600">
              The record has been committed to local storage with assigned tracking ID:
            </p>
            <div className="font-mono font-bold text-lg text-forest bg-forest-50 py-1.5 px-4 rounded-md inline-block border border-forest-200 mt-2">
              #{createdRequest.id}
            </div>
          </div>

          <div className="bg-offwhite rounded-lg p-5 text-left text-xs space-y-2.5 border border-gray-200 max-w-md mx-auto">
            <div className="flex justify-between">
              <span className="text-gray-500">Hardware:</span>
              <strong className="text-charcoal font-semibold">{createdRequest.items}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Declared Quantity:</span>
              <span className="text-charcoal font-medium">{createdRequest.quantity} unit(s) • ~{createdRequest.weight} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Collection Channel:</span>
              <span className="text-charcoal font-medium">{createdRequest.channel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Assigned Facility:</span>
              <span className="text-charcoal font-medium">{createdRequest.center}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Submission Date:</span>
              <span className="text-charcoal font-medium">{createdRequest.date}</span>
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
                  center: 'Metro GreenTech Recycling Hub',
                  notes: '',
                });
              }}
              className="text-xs text-gray-500 hover:text-charcoal underline"
            >
              Register Another Item
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">

          {/* Section 1: Device Specs */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal pb-2 border-b border-gray-100">
              1. Equipment Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Device Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
                >
                  <option value="computing">Computers &amp; Laptops</option>
                  <option value="mobile">Smartphones &amp; Tablets</option>
                  <option value="battery">Batteries &amp; Power Units</option>
                  <option value="peripherals">Cables &amp; Peripherals</option>
                  <option value="appliances">Home &amp; Office Electronics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Brand / Manufacturer *
                </label>
                <input
                  type="text"
                  name="brand"
                  placeholder="e.g. Dell, Apple, Lenovo, HP"
                  value={formData.brand}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest ${
                    formErrors.brand ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                  }`}
                />
                {formErrors.brand && (
                  <span className="text-[11px] text-red-600 mt-1 block">{formErrors.brand}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Model Name / Number *
                </label>
                <input
                  type="text"
                  name="model"
                  placeholder="e.g. Latitude 5420, iPhone 11"
                  value={formData.model}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest ${
                    formErrors.model ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                  }`}
                />
                {formErrors.model && (
                  <span className="text-[11px] text-red-600 mt-1 block">{formErrors.model}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Working Condition *
                </label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
                >
                  <option value="working">Functional (Re-usable / Refurbishable)</option>
                  <option value="repairable">Minor defects (Repairable components)</option>
                  <option value="scrap">Non-functional (Complete scrap / shredding)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  max="500"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest ${
                    formErrors.quantity ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                  }`}
                />
                {formErrors.quantity && (
                  <span className="text-[11px] text-red-600 mt-1 block">{formErrors.quantity}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Approximate Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  name="weight"
                  placeholder="e.g. 2.5"
                  value={formData.weight}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest ${
                    formErrors.weight ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                  }`}
                />
                {formErrors.weight && (
                  <span className="text-[11px] text-red-600 mt-1 block">{formErrors.weight}</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Channel & Facility */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal pb-2 border-b border-gray-100">
              2. Disposal Channel &amp; Assigned Hub
            </h3>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Designated Recycling Facility
              </label>
              <select
                name="center"
                value={formData.center}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
              >
                <option value="Metro GreenTech Recycling Hub">Metro GreenTech Recycling Hub (R2v3 Certified)</option>
                <option value="Central EcoRecycle Depot">Central EcoRecycle Depot (ISO 14001)</option>
                <option value="Apex Material Recovery & Refining">Apex Material Recovery &amp; Refining</option>
                <option value="Community CleanTech Drop Point">Community CleanTech Drop Point</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                  formData.method === 'dropoff'
                    ? 'border-forest bg-forest-50/50 ring-1 ring-forest/30'
                    : 'border-gray-200 hover:border-gray-300'
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
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-charcoal">
                    <MapPin className="w-4 h-4 text-forest" />
                    <span>Drop-off at Center</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Self-deliver directly to the chosen recycling hub.
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                  formData.method === 'pickup'
                    ? 'border-forest bg-forest-50/50 ring-1 ring-forest/30'
                    : 'border-gray-200 hover:border-gray-300'
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
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-charcoal">
                    <Truck className="w-4 h-4 text-forest" />
                    <span>Schedule Doorstep Pickup</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Authorized courier collects hardware from your address.
                  </p>
                </div>
              </label>
            </div>

            {formData.method === 'pickup' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Pickup Address *
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="Building name, department / room, street address, city"
                  value={formData.address}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest ${
                    formErrors.address ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                  }`}
                />
                {formErrors.address && (
                  <span className="text-[11px] text-red-600 mt-1 block">{formErrors.address}</span>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Additional Notes / Serial Numbers (Optional)
              </label>
              <textarea
                name="notes"
                rows="2"
                placeholder="Optional notes regarding battery condition, packaging status, or access instructions."
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <Link
              to="/centers"
              className="text-xs text-gray-500 hover:text-charcoal underline"
            >
              Browse verified centers directory
            </Link>

            <button
              type="submit"
              className="btn-primary text-sm px-6 py-2.5 font-semibold shadow-sm"
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
