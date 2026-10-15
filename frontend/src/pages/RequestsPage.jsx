import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Package,
  CheckCircle2,
  PlusCircle,
  Search,
  Info,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  Clock,
  Building2,
  Scale
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RequestsPage() {
  const { user, getUserRequests, updateRequestStatus } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusUpdateMsg, setStatusUpdateMsg] = useState('');

  // Fetch actual requests from storage service on mount
  useEffect(() => {
    if (user?.email) {
      const records = getUserRequests();
      setRequests(records);
      if (records.length > 0 && !selectedId) {
        setSelectedId(records[0].id);
      }
    }
  }, [user]);

  const steps = [
    { title: 'Submitted', desc: 'Declaration logged' },
    { title: 'Scheduled', desc: 'Depot/courier confirmed' },
    { title: 'In Transit', desc: 'En route to facility' },
    { title: 'Recycled', desc: 'Depolluted & reclaimed' },
  ];

  const filteredRequests = requests.filter((r) =>
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.items.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.center && r.center.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeRequest = requests.find((r) => r.id === selectedId) || requests[0];

  const handleStatusChange = (newStatus) => {
    if (!activeRequest) return;
    try {
      const updated = updateRequestStatus(
        activeRequest.id,
        newStatus,
        `Status transitioned to ${newStatus} by user`
      );

      // Re-fetch and update local state to reflect change immediately
      const refreshedList = getUserRequests();
      setRequests(refreshedList);
      setStatusUpdateMsg(`Request #${activeRequest.id} updated to "${newStatus}".`);
      setTimeout(() => setStatusUpdateMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal">
              Collection Request Tracking
            </h1>
            <span className="text-xs font-mono font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {user?.email}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Monitor real-time custody stages, facility assignments, and status transitions for submitted equipment.
          </p>
        </div>

        <Link
          to="/register"
          className="btn-primary text-xs px-4 py-2 font-semibold shadow-sm self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Disposal Request</span>
        </Link>
      </div>

      {/* Info Notice */}
      <div className="p-3.5 rounded-md bg-forest-50 border border-forest-100 text-forest-900 text-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-forest shrink-0" />
          <span>
            <strong>Storage Service Active:</strong> Records shown reflect submissions saved to your browser localStorage. You can simulate lifecycle stage transitions below to test state updates across views.
          </span>
        </div>
      </div>

      {statusUpdateMsg && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusUpdateMsg}</span>
        </div>
      )}

      {requests.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Requests List (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, hardware, or facility..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest bg-white"
              />
            </div>

            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const isSelected = activeRequest && req.id === activeRequest.id;
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedId(req.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-forest bg-white ring-2 ring-forest/20 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 card-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-forest">
                        #{req.id}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                        req.status === 'Recycled'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : req.status === 'In Transit'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : req.status === 'Scheduled'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-charcoal truncate">
                      {req.items}
                    </h4>
                    <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                      <span>{req.channel}</span>
                      <span>{req.date}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Request Detailed Manifest (7 Cols) */}
          {activeRequest && (
            <div className="lg:col-span-7 bg-white border border-gray-200/90 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">

              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-forest">
                      #{activeRequest.id}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-forest-50 text-forest border border-forest-200">
                      {activeRequest.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-charcoal mt-1">
                    {activeRequest.items}
                  </h2>
                </div>
                <span className="text-xs text-gray-400">
                  Submitted: {activeRequest.date}
                </span>
              </div>

              {/* 4-Step Visual Progress Bar */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Disposal Progression
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {steps.map((st, idx) => {
                    const isPassed = idx <= activeRequest.currentStep;
                    const isCurrent = idx === activeRequest.currentStep;
                    return (
                      <div
                        key={st.title}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          isCurrent
                            ? 'bg-forest-50 border-forest text-forest font-semibold'
                            : isPassed
                            ? 'bg-sage-100/50 border-forest-200 text-charcoal'
                            : 'bg-white border-gray-200 text-gray-400'
                        }`}
                      >
                        <div className="text-xs font-bold">{st.title}</div>
                        <div className="text-[10px] text-gray-500 hidden sm:block mt-0.5">
                          {st.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lifecycle Status Updater (Requirement 7) */}
              <div className="bg-sage-100/60 p-4 rounded-xl border border-sage-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-forest" />
                    <span>Advance Lifecycle Status (Demonstration Control)</span>
                  </span>
                  <span className="text-[11px] text-gray-500">Persists to storage</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {['Submitted', 'Scheduled', 'In Transit', 'Recycled'].map((statusOption) => {
                    const isCurrent = activeRequest.status === statusOption;
                    return (
                      <button
                        key={statusOption}
                        type="button"
                        onClick={() => handleStatusChange(statusOption)}
                        className={`py-1.5 px-2.5 rounded-md text-xs font-semibold border transition-all ${
                          isCurrent
                            ? 'bg-forest text-white border-forest shadow-xs'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        {statusOption}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Request Metadata Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-offwhite p-4 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-500 block mb-0.5">Collection Channel</span>
                  <span className="font-semibold text-charcoal">{activeRequest.channel}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Assigned Facility</span>
                  <span className="font-semibold text-charcoal">{activeRequest.center}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Quantity &amp; Weight</span>
                  <span className="font-semibold text-charcoal">{activeRequest.quantity} unit(s) • ~{activeRequest.weight} kg</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Location / Intake Point</span>
                  <span className="font-semibold text-charcoal truncate block">{activeRequest.address}</span>
                </div>
                {activeRequest.notes && (
                  <div className="sm:col-span-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-500 block mb-0.5">Declaration Notes</span>
                    <span className="text-charcoal italic">{activeRequest.notes}</span>
                  </div>
                )}
              </div>

              {/* Chain-of-Custody Activity Log */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Chain-of-Custody Log
                </h3>
                <div className="space-y-2">
                  {activeRequest.history?.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs bg-white p-2 rounded-lg border border-gray-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-forest mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-charcoal">{h.time}</span>
                        <span className="text-gray-600 block sm:inline sm:ml-2">— {h.event}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      ) : (
        /* Realistic Empty State (No Seed Data) */
        <div className="bg-white border border-gray-200/90 rounded-2xl p-16 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-forest-50 text-forest flex items-center justify-center mx-auto shadow-xs">
            <FolderOpen className="w-7 h-7 text-forest-700" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-charcoal">
              No Collection Requests on Record
            </h2>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
              There are no e-waste tracking records for your account. Complete an item registration to generate your first dispatch manifest.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/register"
              className="btn-primary text-xs px-6 py-2.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register First E-Waste Item</span>
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
