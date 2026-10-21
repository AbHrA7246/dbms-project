import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Search,
  ArrowRight,
  ArrowLeft,
  Check,
  Truck,
  RotateCcw
} from 'lucide-react';
import { storageService } from '../services/storageService';

/**
 * Reusable In-Page Centres Directory Component
 * 
 * Shared between Public Website and Authenticated Customer Portal.
 * Renders real registered recycling facilities within the active layout context.
 */
export default function CentresDirectory({
  onReturn,
  returnLabel = 'Return to Previous View',
  isCustomer = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [centres, setCentres] = useState(() => storageService.getCentres());
  const [preferredCenter, setPreferredCenter] = useState(() => {
    const list = storageService.getCentres();
    return list[0]?.name || '';
  });

  const navigate = useNavigate();

  useEffect(() => {
    const handleUpdate = () => {
      const updated = storageService.getCentres();
      setCentres(updated);
      if (!preferredCenter && updated.length > 0) {
        setPreferredCenter(updated[0].name);
      }
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('ecocycle_storage_update', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('ecocycle_storage_update', handleUpdate);
    };
  }, [preferredCenter]);

  const filteredCenters = centres.filter((center) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      (center.name || '').toLowerCase().includes(query) ||
      (center.city || '').toLowerCase().includes(query) ||
      (center.address || '').toLowerCase().includes(query) ||
      (center.serviceArea || '').toLowerCase().includes(query);

    const matchesCategory =
      selectedCategory === 'all' ||
      (Array.isArray(center.accepted) &&
        center.accepted.some((item) =>
          item.toLowerCase().includes(selectedCategory.toLowerCase())
        ));

    return matchesSearch && matchesCategory;
  });

  const handleRegisterClick = () => {
    if (onReturn) {
      onReturn();
    }
    navigate('/register');
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 page-enter">

      {/* In-Page Return Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-[#3A3E43]">
        <button
          type="button"
          onClick={onReturn}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-charcoal dark:text-[#F5F5F5] bg-white dark:bg-[#202326] border border-gray-300 dark:border-[#3A3E43] hover:border-forest dark:hover:border-[#FF7028] hover:text-forest dark:hover:text-[#FF7028] shadow-2xs transition-all self-start sm:self-auto group"
        >
          <ArrowLeft className="w-4 h-4 text-forest dark:text-[#FF7028] transition-transform group-hover:-translate-x-0.5" />
          <span>{returnLabel}</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#B8BDC3]">
          <span className="w-2 h-2 rounded-full bg-[#F45D16] dark:bg-[#FF7028] animate-pulse" />
          <span className="font-medium">
            {isCustomer ? 'Customer Portal Directory View' : 'Public Network Directory View'}
          </span>
        </div>
      </div>

      {/* Directory Title and Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
            Collection Centres Directory
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-[#B8BDC3] max-w-2xl leading-relaxed">
            Explore verified regional e-waste collection centres and depollution depots across the EcoCycle network.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRegisterClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-forest dark:bg-[#FF7028] dark:hover:bg-[#F45D16] text-white hover:bg-forest-900 text-xs font-semibold transition-colors shadow-2xs"
          >
            <span>Register E-Waste</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty State: Exactly "No recycling centres are available yet." */}
      {centres.length === 0 ? (
        <div className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-10 sm:p-14 text-center space-y-5 shadow-xs max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] text-forest dark:text-[#FF7028] flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7 text-forest-700 dark:text-[#FF7028]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-charcoal dark:text-[#F5F5F5]">
              No recycling centres are available yet.
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-[#B8BDC3] leading-relaxed max-w-md mx-auto">
              No collection hubs or processing facilities are currently active in this regional network. Check back soon as new facilities register.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onReturn}
              className="btn-secondary text-xs px-5 py-2.5 font-semibold inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{returnLabel}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Preferred Facility Bar (for authenticated customers) */}
          {isCustomer && preferredCenter && (
            <div className="p-3.5 rounded-lg bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] text-forest-800 dark:text-[#FF7028] text-xs flex items-center justify-between gap-3 flex-wrap shadow-2xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-forest dark:text-[#FF7028]" />
                <span>Default Designated Hub: <strong>{preferredCenter}</strong></span>
              </div>
              <span className="text-[11px] text-forest-600 dark:text-[#FF7028]/80">
                Pre-selected when declaring hardware
              </span>
            </div>
          )}

          {/* Search and Category Filter Toolbar */}
          <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 shadow-2xs">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-gray-400 dark:text-[#B8BDC3] absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by facility name, address, or city..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028] bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5]"
              >
                <option value="all">All Accepted Categories</option>
                <option value="Computers">Computers &amp; Laptops</option>
                <option value="Smartphones">Smartphones &amp; Tablets</option>
                <option value="Batteries">Batteries &amp; Power</option>
                <option value="Displays">Displays &amp; Monitors</option>
                <option value="Appliances">Home &amp; Office Appliances</option>
              </select>
            </div>
          </div>

          {/* Registered Centres Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCenters.length > 0 ? (
              filteredCenters.map((center) => {
                const isPreferred = preferredCenter === center.name;
                return (
                  <div
                    key={center.id}
                    className={`bg-white dark:bg-[#292D31] border rounded-2xl p-6 space-y-4 shadow-2xs transition-all hover:border-gray-300 dark:hover:border-[#FF7028]/40 ${
                      isCustomer && isPreferred
                        ? 'border-forest dark:border-[#FF7028] ring-1 ring-forest/30 dark:ring-[#FF7028]/30'
                        : 'border-gray-200 dark:border-[#3A3E43]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-[#FFF3EB] dark:bg-[#202326] text-[#F45D16] dark:text-[#FF7028] flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-[#F45D16] dark:text-[#FF7028]" />
                          </span>
                          <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                            {center.name}
                          </h3>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B83A05] dark:text-[#FF7028] bg-[#FFF3EB] dark:bg-[#FF7028]/15 px-2 py-0.5 rounded border border-[#FFE6D5] dark:border-[#FF7028]/30">
                          <ShieldCheck className="w-3 h-3 text-[#F45D16] dark:text-[#FF7028]" />
                          {center.certification || 'Verified Recycling Facility'}
                        </span>
                      </div>

                      {isCustomer && isPreferred && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F45D16] dark:text-[#FF7028] bg-[#FFF3EB] dark:bg-[#FF7028]/15 px-2.5 py-1 rounded-full border border-[#FECCA9] dark:border-[#FF7028]/30">
                          <Check className="w-3 h-3 text-[#F45D16] dark:text-[#FF7028]" />
                          Default Hub
                        </span>
                      )}
                    </div>

                    {/* Facility Address, Hours, Phone */}
                    <div className="space-y-2 text-xs text-gray-600 dark:text-[#B8BDC3] pt-2 border-t border-gray-100 dark:border-[#3A3E43]">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-[#B8BDC3] shrink-0" />
                        <span>{center.address}, {center.city} {center.serviceArea && `(${center.serviceArea})`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-[#B8BDC3] shrink-0" />
                        <span>{center.operatingDays || 'Monday to Friday'}: {center.hours || '09:00 AM – 05:00 PM'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 dark:text-[#B8BDC3] shrink-0" />
                        <span>{center.phone}</span>
                      </div>
                    </div>

                    {/* Supported Services Badges */}
                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-gray-400 dark:text-[#B8BDC3] uppercase tracking-wider block mb-1">
                        Supported Services
                      </span>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {center.pickupAvailable && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFF3EB] dark:bg-[#FF7028]/15 text-[#B83A05] dark:text-[#FF7028] border border-[#FFE6D5] dark:border-[#FF7028]/30 font-medium text-[11px]">
                            <Truck className="w-3.5 h-3.5 text-[#F45D16] dark:text-[#FF7028]" />
                            Doorstep Pickup Supported
                          </span>
                        )}
                        {center.dropoffAvailable && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-[#202326] text-gray-700 dark:text-[#F5F5F5] border border-gray-200 dark:border-[#3A3E43] font-medium text-[11px]">
                            <Building2 className="w-3.5 h-3.5 text-gray-500 dark:text-[#B8BDC3]" />
                            Depot Drop-off Supported
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Accepted Categories */}
                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-gray-400 dark:text-[#B8BDC3] uppercase tracking-wider block mb-1.5">
                        Accepted E-Waste Streams
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(center.accepted || []).map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs rounded bg-offwhite dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] text-charcoal dark:text-[#F5F5F5] font-medium"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-gray-100 dark:border-[#3A3E43] flex items-center justify-between text-xs">
                      {isCustomer ? (
                        <button
                          type="button"
                          onClick={() => setPreferredCenter(center.name)}
                          className="text-gray-500 dark:text-[#B8BDC3] hover:text-[#F45D16] dark:hover:text-[#FF7028] underline"
                        >
                          {isPreferred ? 'Current default hub' : 'Set as default hub'}
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-[#B8BDC3] text-[11px]">
                          Verified municipal intake
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={handleRegisterClick}
                        className="inline-flex items-center gap-1.5 font-semibold text-forest dark:text-[#FF7028] hover:text-forest-900 dark:hover:text-[#F45D16] hover:underline"
                      >
                        <span>Register item here</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="md:col-span-2 text-center py-12 bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6">
                <p className="text-sm text-gray-600 dark:text-[#B8BDC3]">No collection centres found matching your filters.</p>
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                  className="mt-3 text-xs text-forest dark:text-[#FF7028] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset search filters</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Return Action Bar */}
          <div className="pt-6 border-t border-gray-200 dark:border-[#3A3E43] flex justify-center">
            <button
              type="button"
              onClick={onReturn}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-charcoal dark:text-[#F5F5F5] bg-white dark:bg-[#202326] border border-gray-300 dark:border-[#3A3E43] hover:border-forest dark:hover:border-[#FF7028] hover:text-forest dark:hover:text-[#FF7028] shadow-2xs transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>{returnLabel}</span>
            </button>
          </div>
        </>
      )}

    </div>
  );
}
