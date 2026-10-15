import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Search,
  ArrowRight,
  Info,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CentersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [preferredCenter, setPreferredCenter] = useState('Metro GreenTech Recycling Hub');
  const { user } = useAuth();
  const navigate = useNavigate();

  const regionalCenters = [
    {
      id: 'center-1',
      name: 'Metro GreenTech Recycling Hub',
      address: '142 Industrial Parkway, Tech District',
      city: 'Metro City',
      phone: '+1 (555) 329-8801',
      hours: 'Mon – Fri: 08:30 AM – 05:30 PM',
      certification: 'R2v3 Certified & e-Stewards',
      accepted: ['Computers', 'Smartphones', 'Batteries', 'Servers'],
    },
    {
      id: 'center-2',
      name: 'Central EcoRecycle Depot',
      address: '88 Circular Avenue, Sector 4',
      city: 'Metro City',
      phone: '+1 (555) 782-4419',
      hours: 'Mon – Sat: 09:00 AM – 06:00 PM',
      certification: 'ISO 14001 & State Environmental Board',
      accepted: ['Home Electronics', 'Displays', 'Cables', 'Batteries'],
    },
    {
      id: 'center-3',
      name: 'Apex Material Recovery & Refining',
      address: '304 Smelter Road, Heavy Industrial Zone',
      city: 'Riverdale',
      phone: '+1 (555) 912-3300',
      hours: 'Mon – Fri: 07:00 AM – 04:00 PM',
      certification: 'R2v3 Certified & DoD Sanitization Compliant',
      accepted: ['Computers', 'Circuit Boards', 'Industrial Hardware'],
    },
    {
      id: 'center-4',
      name: 'Community CleanTech Drop Point',
      address: '12 Civic Square, North Campus',
      city: 'University District',
      phone: '+1 (555) 441-2099',
      hours: 'Tue – Sun: 10:00 AM – 07:00 PM',
      certification: 'Municipal E-Waste Partner Hub',
      accepted: ['Smartphones', 'Tablets', 'Laptops', 'Small Appliances'],
    },
  ];

  const filteredCenters = regionalCenters.filter((center) => {
    const matchesSearch =
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      center.accepted.some(item => item.toLowerCase().includes(selectedCategory.toLowerCase()));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 page-enter">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal">
            Collection Centers Directory
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl">
            Select verified facilities for direct drop-offs or assign them as processing refiners for your pickup requests.
          </p>
        </div>

        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-forest text-white hover:bg-forest-900 text-sm font-medium transition-colors shadow-sm self-start sm:self-auto"
        >
          <span>Register New Item</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Prototype Banner */}
      <div className="p-3.5 rounded-md bg-forest-50 border border-forest-100 text-forest-800 text-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-forest" />
          <span><strong>Private Facility Portal:</strong> Select or bookmark a preferred collection hub for your account (<strong>{user?.email}</strong>).</span>
        </div>
        <span className="text-forest-700 font-medium">
          Preferred Facility: <strong>{preferredCenter}</strong>
        </span>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 shadow-xs">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by facility name, address, or city..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
          >
            <option value="all">All Accepted Categories</option>
            <option value="Computers">Computers &amp; Laptops</option>
            <option value="Smartphones">Mobile &amp; Telecom</option>
            <option value="Batteries">Batteries &amp; Power</option>
            <option value="Displays">Displays &amp; Monitors</option>
          </select>
        </div>
      </div>

      {/* Centers Listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCenters.length > 0 ? (
          filteredCenters.map((center) => {
            const isPreferred = preferredCenter === center.name;
            return (
              <div
                key={center.id}
                className={`bg-white border rounded-lg p-6 space-y-4 shadow-xs transition-all ${
                  isPreferred ? 'border-forest ring-1 ring-forest/30' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-md bg-forest-50 text-forest flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </span>
                      <h3 className="text-base font-bold text-charcoal">
                        {center.name}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emeraldEco bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      {center.certification}
                    </span>
                  </div>

                  {isPreferred && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-forest bg-forest-50 px-2.5 py-1 rounded-full border border-forest-200">
                      <Check className="w-3 h-3" />
                      My Preferred Hub
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{center.address}, {center.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{center.hours}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{center.phone}</span>
                  </div>
                </div>

                {/* Accepted tags */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Accepted Streams
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {center.accepted.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs rounded bg-offwhite border border-gray-200 text-charcoal"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* User-Specific Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setPreferredCenter(center.name)}
                    className="text-gray-500 hover:text-charcoal underline"
                  >
                    {isPreferred ? 'Current default' : 'Set as default hub'}
                  </button>

                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 font-semibold text-forest hover:underline"
                  >
                    <span>Register item here</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="md:col-span-2 text-center py-12 bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-sm text-gray-600">No collection centers found matching your filters.</p>
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
              className="mt-3 text-xs text-forest font-semibold hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
