import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  ArrowRight,
  User,
  CalendarCheck,
  CalendarClock
} from 'lucide-react';
import { useCentreAuth } from '../../context/CentreAuthContext';
import { storageService } from '../../services/storageService';

export default function CentreAppointmentsPage() {
  const { currentCentre } = useCentreAuth();
  const [searchParams] = useSearchParams();
  const initialTypeFilter = searchParams.get('type') || 'all';

  const [requests, setRequests] = useState([]);
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const loadAppointments = () => {
    if (currentCentre?.id) {
      const centreReqs = storageService.getRequestsForCentre(currentCentre.id);
      // Filter for items that have appointment data or are scheduled
      const apptRequests = centreReqs.filter(
        (r) =>
          r.appointment ||
          ['Scheduled', 'Schedule Proposed', 'Confirmed', 'Reschedule Requested', 'In Transit', 'Received', 'Drop-off Completed'].includes(
            r.status
          )
      );
      setRequests(apptRequests);
    }
  };

  useEffect(() => {
    loadAppointments();
    const handleUpdate = () => loadAppointments();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('ecocycle_storage_update', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('ecocycle_storage_update', handleUpdate);
    };
  }, [currentCentre?.id]);

  const filteredAppointments = requests.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.items.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.customerName && r.customerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' ? true : r.method === typeFilter;

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'scheduled'
        ? (r.status === 'Scheduled' || r.status === 'Confirmed')
        : statusFilter === 'in_transit'
        ? r.status === 'In Transit'
        : statusFilter === 'received'
        ? (r.status === 'Received' || r.status === 'Drop-off Completed')
        : statusFilter === 'proposed'
        ? r.status === 'Schedule Proposed'
        : statusFilter === 'reschedule'
        ? r.status === 'Reschedule Requested'
        : true;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleMarkCompleted = (requestId, method) => {
    try {
      const newStatus = method === 'pickup' ? 'In Transit' : 'Received';
      const note =
        method === 'pickup'
          ? 'Courier van verified on-site collection; transit to facility initiated'
          : 'Customer delivered hardware at drop-off desk; intake inspection complete';
      storageService.updateCentreLifecycleStatus(requestId, currentCentre.id, newStatus, note);
      setActionMsg(`Request #${requestId} status updated to ${newStatus}.`);
      setTimeout(() => setActionMsg(''), 3000);
      loadAppointments();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 page-enter text-charcoal dark:text-[#F5F5F5]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#3A3E43]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
              Appointments &amp; Dispatch Schedule
            </h1>
            <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800/60">
              {currentCentre?.name}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-1">
            Track confirmed pickups, drop-off time slots, and pending customer scheduling confirmations.
          </p>
        </div>

        <Link
          to="/centre/requests"
          className="btn-primary text-xs px-4 py-2 font-semibold shadow-sm self-start sm:self-auto"
        >
          <span>Incoming Requests</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 shadow-xs">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-gray-400 dark:text-[#B8BDC3] absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, customer name, or item..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 dark:border-[#3A3E43] rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full text-xs p-2 border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
          >
            <option value="all">All Channels (Pickups &amp; Drop-offs)</option>
            <option value="pickup">Doorstep Pickups Only</option>
            <option value="dropoff">Depot Drop-offs Only</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs p-2 border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
          >
            <option value="all">All Appointment Stages</option>
            <option value="scheduled">Scheduled / Confirmed Appointments</option>
            <option value="in_transit">In Transit (Pickups)</option>
            <option value="received">Received at Kiosk/Facility</option>
            <option value="proposed">Awaiting Customer Confirmation</option>
            <option value="reschedule">Reschedule Requested</option>
          </select>
        </div>
      </div>

      {/* Appointments Grid */}
      {filteredAppointments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAppointments.map((req) => {
            const isConfirmed = req.status === 'Confirmed' || req.status === 'Scheduled';
            const isProposed = req.status === 'Schedule Proposed';
            const isReschedule = req.status === 'Reschedule Requested';
            const isReceived = ['Received', 'Drop-off Completed', 'Processing', 'Completed'].includes(req.status);

            return (
              <div
                key={req.id}
                className={`bg-white dark:bg-[#292D31] border rounded-xl p-5 space-y-3 shadow-xs transition-all ${
                  isReschedule
                    ? 'border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-200 dark:ring-amber-800/40 bg-amber-50/20 dark:bg-amber-950/20'
                    : isProposed
                    ? 'border-purple-200 dark:border-purple-800/60 bg-purple-50/20 dark:bg-purple-950/20'
                    : 'border-gray-200 dark:border-[#3A3E43]'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
                  <div className="flex items-center gap-1.5">
                    {req.method === 'pickup' ? (
                      <Truck className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                    ) : (
                      <MapPin className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                    )}
                    <span className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">{req.channel}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isConfirmed
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : isReschedule
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                      : isProposed
                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                      : 'bg-gray-100 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3] border-gray-200 dark:border-[#3A3E43]'
                  }`}>
                    {req.status}
                  </span>
                </div>

                {/* Request & Hardware info */}
                <div>
                  <span className="font-mono text-xs font-bold text-forest dark:text-[#FF7028]">#{req.id}</span>
                  <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5] mt-0.5 truncate">
                    {req.items}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                    Customer: <strong className="text-charcoal dark:text-[#F5F5F5]">{req.customerName || req.userEmail}</strong>
                  </p>
                </div>

                {/* Date & Time Slot */}
                <div className="bg-gray-50 dark:bg-[#202326] rounded-lg p-3 text-xs space-y-1.5 border border-gray-100 dark:border-[#3A3E43]">
                  <div className="flex items-center gap-2 text-charcoal dark:text-[#F5F5F5] font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
                    <span>{req.appointment?.date || 'Pending Date'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-[#B8BDC3]">
                    <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-[#B8BDC3]" />
                    <span>{req.appointment?.timeWindow || 'Time window not set'}</span>
                  </div>
                  {req.method === 'dropoff' ? (
                    <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3] pt-1 border-t border-gray-200 dark:border-[#3A3E43] truncate">
                      🏢 Drop-off Depot: {storageService.getRequestDisplayAddress(req)}
                    </div>
                  ) : req.address ? (
                    <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3] pt-1 border-t border-gray-200 dark:border-[#3A3E43] truncate">
                      📍 {req.address}
                    </div>
                  ) : null}
                </div>

                {/* Reschedule Note from Customer if applicable */}
                {isReschedule && req.appointment?.customerNote && (
                  <div className="p-2 rounded bg-orange-100/60 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-[11px] text-orange-900 dark:text-orange-200">
                    <strong>Customer Reschedule Request:</strong>
                    <div>"{req.appointment.customerNote}"</div>
                  </div>
                )}

                {/* Action button */}
                <div className="pt-2 border-t border-gray-100 dark:border-[#3A3E43] flex items-center justify-between">
                  <Link
                    to={`/centre/requests?selected=${req.id}`}
                    className="text-xs font-semibold text-forest dark:text-[#FF7028] dark:hover:text-[#F45D16] hover:underline"
                  >
                    Open Manifest →
                  </Link>

                  {isConfirmed && !isReceived && req.status !== 'In Transit' && (
                    <button
                      type="button"
                      onClick={() => handleMarkCompleted(req.id, req.method)}
                      className="btn-primary text-xs px-3 py-1.5 font-semibold shadow-xs"
                    >
                      {req.method === 'pickup' ? 'Dispatch Pickup' : 'Record Drop-off Receipt'}
                    </button>
                  )}

                  {req.status === 'In Transit' && (
                    <button
                      type="button"
                      onClick={() => {
                        storageService.updateCentreLifecycleStatus(
                          req.id,
                          currentCentre.id,
                          'Received',
                          'Courier returned to facility with hardware; physical custody received and verified'
                        );
                        setActionMsg(`Request #${req.id} marked as Received.`);
                        setTimeout(() => setActionMsg(''), 3000);
                        loadAppointments();
                      }}
                      className="btn-primary text-xs px-3 py-1.5 font-semibold shadow-xs"
                    >
                      Mark Received
                    </button>
                  )}

                  {isReschedule && (
                    <Link
                      to={`/centre/requests?selected=${req.id}`}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded-md font-semibold shadow-xs"
                    >
                      Propose New Time
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-16 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex items-center justify-center mx-auto">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
            No Scheduled Appointments Found
          </h2>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] max-w-sm mx-auto">
            When you propose appointment dates for incoming requests, they will populate your dispatch calendar here.
          </p>
          <div className="pt-2">
            <Link
              to="/centre/requests"
              className="btn-primary text-xs px-4 py-2 font-semibold inline-flex items-center gap-1.5"
            >
              <span>Review Incoming Declarations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}

