import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Inbox, 
  CheckCircle2, 
  CalendarClock, 
  Truck, 
  MapPin, 
  Gauge, 
  ArrowRight, 
  AlertCircle,
  Clock,
  Package,
  Layers,
  Filter,
  Download
} from 'lucide-react';
import { useCentreAuth } from '../../context/CentreAuthContext';
import { storageService } from '../../services/storageService';

export default function CentreDashboardPage() {
  const { currentCentre } = useCentreAuth();
  const [requests, setRequests] = useState([]);
  const [workload, setWorkload] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');

  const loadData = () => {
    if (currentCentre?.id) {
      const centreReqs = storageService.getRequestsForCentre(currentCentre.id);
      setRequests(centreReqs);
      const wl = storageService.getCentreWorkload(currentCentre.id);
      setWorkload(wl);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to updates from other tabs or actions
    const handleUpdate = () => loadData();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('ecocycle_storage_update', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('ecocycle_storage_update', handleUpdate);
    };
  }, [currentCentre?.id]);

  // Derived metrics for summary cards
  const awaitingReviewCount = requests.filter((r) => r.status === 'Submitted').length;
  const acceptedCount = requests.filter((r) => ['Accepted', 'Scheduled'].includes(r.status)).length;
  const awaitingCustomerConfirmationCount = requests.filter(
    (r) => r.status === 'Schedule Proposed'
  ).length;
  const upcomingPickupsCount = requests.filter(
    (r) => ['Scheduled', 'Confirmed', 'In Transit'].includes(r.status) && r.method === 'pickup'
  ).length;
  const upcomingDropoffsCount = requests.filter(
    (r) => ['Scheduled', 'Confirmed', 'Received', 'Drop-off Completed'].includes(r.status) && r.method === 'dropoff'
  ).length;
  const receivedCount = requests.filter(
    (r) => ['Received', 'Drop-off Completed', 'Processing', 'Completed', 'Recycled'].includes(r.status)
  ).length;

  const summaryCards = [
    {
      title: 'Awaiting Review',
      count: awaitingReviewCount,
      desc: 'New customer item declarations',
      icon: Inbox,
      badgeColor: awaitingReviewCount > 0 ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' : 'bg-gray-100 dark:bg-[#202326] text-gray-600 dark:text-[#B8BDC3]',
      link: '/centre/requests?status=Submitted',
    },
    {
      title: 'Accepted Pipeline',
      count: acceptedCount,
      desc: 'Approved hardware ready for slot',
      icon: CheckCircle2,
      badgeColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
      link: '/centre/requests?status=Accepted',
    },
    {
      title: 'Awaiting Customer',
      count: awaitingCustomerConfirmationCount,
      desc: 'Slots proposed to customer',
      icon: CalendarClock,
      badgeColor: awaitingCustomerConfirmationCount > 0 ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-[#202326] text-gray-600 dark:text-[#B8BDC3]',
      link: '/centre/appointments?status=proposed',
    },
    {
      title: 'Upcoming Pickups',
      count: upcomingPickupsCount,
      desc: 'Confirmed courier dispatches',
      icon: Truck,
      badgeColor: 'bg-[#FFF3EB] dark:bg-[#FF7028]/15 text-[#B83A05] dark:text-[#FF7028]',
      link: '/centre/appointments?type=pickup',
    },
    {
      title: 'Upcoming Drop-offs',
      count: upcomingDropoffsCount,
      desc: 'Confirmed depot walk-ins',
      icon: MapPin,
      badgeColor: 'bg-gray-100 dark:bg-[#202326] text-gray-700 dark:text-[#F5F5F5]',
      link: '/centre/appointments?type=dropoff',
    },
    {
      title: 'Received at Facility',
      count: receivedCount,
      desc: 'Physical e-waste received',
      icon: Package,
      badgeColor: 'bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028]',
      link: '/centre/requests?status=Received',
    },
  ];

  // Filter recent requests
  const recentRequests = requests.slice(0, 5);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 page-enter text-charcoal dark:text-[#F5F5F5]">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#3A3E43]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
              {currentCentre?.name}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] border border-forest-200 dark:border-[#3A3E43]">
              Active Hub
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-1">
            {currentCentre?.address}, {currentCentre?.city} • Certification: <strong className="text-charcoal dark:text-[#F5F5F5]">{currentCentre?.certification}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/centre/requests"
            className="btn-primary text-xs px-4 py-2 font-semibold shadow-sm"
          >
            <span>Review Incoming Requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/centre/settings?tab=schedule"
            className="btn-secondary text-xs px-4 py-2 font-semibold"
          >
            <span>Capacity Controls</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              storageService.downloadAnalyticsCsv(`ecocycle_${currentCentre?.id || 'centre'}_dataset.csv`, {
                centreId: currentCentre?.id,
              });
            }}
            className="btn-secondary text-xs px-3.5 py-2 font-semibold inline-flex items-center gap-1.5"
            title="Export pseudonymized operational CSV dataset for R statistical analysis"
          >
            <Download className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
            <span>Export for R Analytics</span>
          </button>
        </div>
      </div>

      {/* Capacity Utilization Banner */}
      {workload && (
        <div className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5]">
                Current Week Capacity Utilization (Mon–Sun)
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-[#B8BDC3]">
              Current Week Booked: <strong className="text-charcoal dark:text-[#F5F5F5]">{workload.currentWeekBookedKg ?? workload.totalAllocatedKg} kg</strong> / {workload.capacityKg} kg weekly capacity
            </span>
          </div>

          <div className="w-full bg-gray-100 dark:bg-[#101010] rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                workload.isNearCapacity ? 'bg-amber-500' : 'bg-forest dark:bg-[#FF7028]'
              }`}
              style={{ width: `${workload.percentKg}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-[#B8BDC3]">
            <span>
              Utilization: <strong className="text-charcoal dark:text-[#F5F5F5]">{workload.percentKg}% by mass</strong> • {workload.percentUnits}% by unit count ({workload.currentWeekBookedUnits ?? workload.totalAllocatedUnits} units across {workload.currentWeekBookedCount ?? 0} booked appointments)
            </span>
            {workload.isNearCapacity ? (
              <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Near weekly maximum threshold
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                Normal processing bandwidth available
              </span>
            )}
          </div>

          {/* Operational Pipeline Metrics Breakdown */}
          <div className="pt-2.5 border-t border-gray-100 dark:border-[#3A3E43] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-gray-50/70 dark:bg-[#202326] border border-gray-100 dark:border-[#3A3E43]">
              <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-[#B8BDC3] block">
                Current Week Booked
              </span>
              <span className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">
                {workload.currentWeekBookedKg ?? workload.totalAllocatedKg} kg
              </span>
              <span className="text-[11px] text-gray-500 dark:text-[#B8BDC3]/80 block mt-0.5">
                {workload.currentWeekBookedCount ?? 0} appointments ({workload.currentWeekBookedUnits ?? 0} units)
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/80 dark:border-amber-900/40">
              <span className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-300 block">
                Intake Pipeline (Unscheduled Queue)
              </span>
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {workload.unassignedKg ?? 0} kg
              </span>
              <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 block mt-0.5">
                {workload.unassignedCount ?? 0} pending slot allocation ({workload.unassignedUnits ?? 0} units)
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-gray-50/70 dark:bg-[#202326] border border-gray-100 dark:border-[#3A3E43]">
              <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-[#B8BDC3] block">
                Lifetime Active Operations
              </span>
              <span className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">
                {workload.lifetimeActiveKg ?? workload.totalAllocatedKg} kg
              </span>
              <span className="text-[11px] text-gray-500 dark:text-[#B8BDC3]/80 block mt-0.5">
                {workload.lifetimeActiveCount ?? workload.activeCount} active requests in custody/transit
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6 Key Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-xl p-5 space-y-2 shadow-xs hover:border-forest-300 dark:hover:border-[#FF7028]/50 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-[#B8BDC3] uppercase tracking-wider">
                  {card.title}
                </span>
                <span className={`p-2 rounded-lg ${card.badgeColor}`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-charcoal dark:text-[#F5F5F5] tracking-tight">
                {card.count}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-[#B8BDC3] pt-1">
                <span>{card.desc}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 dark:text-[#B8BDC3] group-hover:text-forest dark:group-hover:text-[#FF7028] group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Dispatches for this Centre */}
      <div className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#3A3E43] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
              Assigned Intake Queue
            </h2>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3]">
              Declarations routed specifically to {currentCentre?.name}
            </p>
          </div>
          <Link
            to="/centre/requests"
            className="text-xs font-semibold text-forest dark:text-[#FF7028] dark:hover:text-[#F45D16] hover:underline flex items-center gap-1"
          >
            <span>View All ({requests.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-[#3A3E43] text-left text-sm">
              <thead className="bg-offwhite dark:bg-[#202326] text-gray-500 dark:text-[#B8BDC3] text-xs font-medium uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Tracking ID</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Equipment</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#3A3E43] bg-white dark:bg-[#292D31]">
                {recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/80 dark:hover:bg-[#202326] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-forest dark:text-[#FF7028]">
                      #{req.id}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-charcoal dark:text-[#F5F5F5]">
                      {req.customerName || req.userEmail}
                      <span className="block text-[11px] text-gray-400 dark:text-[#B8BDC3]/60 font-normal">
                        {req.userEmail}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-charcoal dark:text-[#F5F5F5]">
                      {req.items}
                      <span className="block text-[11px] text-gray-400 dark:text-[#B8BDC3]/60 font-normal">
                        {req.quantity} unit(s) • ~{req.weight} kg
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-[#B8BDC3]">
                      <span className="inline-flex items-center gap-1">
                        {req.method === 'pickup' ? (
                          <Truck className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
                        )}
                        <span>{req.channel}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        req.status === 'Submitted'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                          : req.status === 'Accepted'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                          : req.status === 'Schedule Proposed'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                          : req.status === 'Confirmed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : req.status === 'Rejected'
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60'
                          : 'bg-gray-100 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3] border-gray-200 dark:border-[#3A3E43]'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/centre/requests?selected=${req.id}`}
                        className="text-xs font-semibold text-forest dark:text-[#FF7028] dark:hover:text-[#F45D16] hover:underline"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 px-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5 text-forest-700 dark:text-[#FF7028]" />
            </div>
            <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">
              No Requests Currently Assigned
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3] max-w-md mx-auto leading-relaxed">
              Customer declarations and collection dispatches will appear here automatically when requests are routed to this facility.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

