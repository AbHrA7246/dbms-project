import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Truck,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  Scale,
  FolderOpen,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDirectory } from '../context/DirectoryContext';

export default function DashboardPage() {
  const { user, getUserRequests } = useAuth();
  const { openDirectory } = useDirectory();
  const [requests, setRequests] = useState([]);

  const loadDashboardData = () => {
    if (user?.email) {
      const records = getUserRequests();
      setRequests(records);
    }
  };

  // Fetch actual saved records on mount and on storage events
  useEffect(() => {
    loadDashboardData();

    const handleUpdate = () => loadDashboardData();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('ecocycle_storage_update', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('ecocycle_storage_update', handleUpdate);
    };
  }, [user]);

  // Data integrity rules: Cancelled and Rejected declarations must NOT count toward active or diverted hardware mass
  const validRequests = requests.filter(
    (r) => !['Cancelled', 'Rejected'].includes(r.status)
  );
  const activeRequests = requests.filter(
    (r) => ['Submitted', 'Scheduled', 'Accepted', 'Schedule Proposed', 'In Transit', 'Reschedule Requested'].includes(r.status)
  );
  const receivedRequests = requests.filter((r) =>
    ['Received', 'Drop-off Completed', 'Processing', 'Completed', 'Recycled'].includes(r.status)
  );

  const totalItems = requests.length;
  const activeDispatches = activeRequests.length;
  const receivedCount = receivedRequests.length;

  // Mass of valid hardware declarations (excluding cancelled and rejected)
  const totalWeight = Number(
    validRequests
      .reduce((sum, r) => sum + (Number(r.weight) || 0), 0)
      .toFixed(2)
  );

  // Completed/recycled diverted hardware mass
  const recycledWeight = Number(
    receivedRequests
      .reduce((sum, r) => sum + (Number(r.weight) || 0), 0)
      .toFixed(2)
  );

  // Active in-flight hardware mass
  const activeWeight = Number(
    activeRequests
      .reduce((sum, r) => sum + (Number(r.weight) || 0), 0)
      .toFixed(2)
  );

  const pendingAppointmentRequests = requests.filter(
    (r) => r.status === 'Schedule Proposed'
  );

  const summaryCards = [
    {
      label: 'Registered Items',
      count: `${totalItems} ${totalItems === 1 ? 'Declaration' : 'Declarations'}`,
      desc: validRequests.length !== totalItems
        ? `${validRequests.length} active/diverted (${totalItems - validRequests.length} cancelled/rejected)`
        : 'Originating from your submissions',
      icon: Package,
    },
    {
      label: 'Active Dispatches',
      count: `${activeDispatches} In Progress`,
      desc: `${activeWeight} kg in scheduling or transit`,
      icon: Truck,
    },
    {
      label: 'Received at Facility',
      count: `${receivedCount} Received`,
      desc: `${recycledWeight} kg custody verified & diverted`,
      icon: CheckCircle2,
    },
    {
      label: 'Estimated Mass',
      count: `${totalWeight} kg`,
      desc: 'Active & diverted mass (excl. cancelled)',
      icon: Scale,
    },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 page-enter text-charcoal dark:text-[#F5F5F5]">

      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#3A3E43]">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
            Personal Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-[#B8BDC3]">
            Account: <strong>{user?.email}</strong> • Affiliation: <span className="font-medium text-charcoal dark:text-[#F5F5F5]">{user?.userType}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/register"
            className="btn-primary text-xs px-4 py-2 font-semibold shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Declaration</span>
          </Link>
          <Link
            to="/requests"
            className="btn-secondary text-xs px-4 py-2 font-semibold"
          >
            <span>Track Requests</span>
          </Link>
        </div>
      </div>

      {/* Pending Appointment Confirmation Alert Banner */}
      {pendingAppointmentRequests.length > 0 && (
        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 text-purple-900 dark:text-purple-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm">
                Action Required: {pendingAppointmentRequests.length} Appointment Proposal{pendingAppointmentRequests.length > 1 ? 's' : ''} Awaiting Confirmation
              </div>
              <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                The recycling facility has proposed a scheduled date and time slot for your e-waste collection.
              </p>
            </div>
          </div>
          <Link
            to={`/requests?selected=${pendingAppointmentRequests[0].id}`}
            className="btn-primary text-xs px-4 py-2 font-semibold shadow-xs shrink-0 self-start sm:self-auto"
          >
            <span>Review &amp; Confirm Proposal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-xl p-6 space-y-2 shadow-xs card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-[#B8BDC3] uppercase tracking-wider">
                  {card.label}
                </span>
                <div className="w-8 h-8 rounded-lg bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-forest-700 dark:text-[#FF7028]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-charcoal dark:text-[#F5F5F5] tracking-tight">
                {card.count}
              </div>
              <p className="text-xs text-gray-500 dark:text-[#B8BDC3]">
                {card.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Dispatches Section */}
      <div className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#3A3E43] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
              Your E-Waste Submissions
            </h2>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3]">
              Real-time record log persisted across sessions
            </p>
          </div>
          {requests.length > 0 && (
            <Link to="/requests" className="text-xs font-semibold text-forest dark:text-[#FF7028] hover:underline flex items-center gap-1">
              <span>Open tracking workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-[#3A3E43] text-left text-sm">
              <thead className="bg-offwhite dark:bg-[#202326] text-gray-500 dark:text-[#B8BDC3] text-xs font-medium uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3">Tracking ID</th>
                  <th scope="col" className="px-6 py-3">Hardware Items</th>
                  <th scope="col" className="px-6 py-3">Assigned Facility</th>
                  <th scope="col" className="px-6 py-3">Channel</th>
                  <th scope="col" className="px-6 py-3">Submission Date</th>
                  <th scope="col" className="px-6 py-3">Lifecycle Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#3A3E43] bg-white dark:bg-[#292D31]">
                {requests.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-[#202326] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-forest dark:text-[#FF7028]">
                      #{item.id}
                    </td>
                    <td className="px-6 py-4 font-medium text-charcoal dark:text-[#F5F5F5]">
                      {item.items}
                      <span className="text-[11px] text-gray-400 dark:text-[#B8BDC3] block font-normal capitalize">
                        {item.condition} condition • {item.weight} kg
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-[#B8BDC3] truncate max-w-xs">
                      {item.center}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-[#B8BDC3]">
                      {item.channel}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-[#B8BDC3]">
                      {item.date}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${
                        item.status === 'Recycled'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : item.status === 'In Transit'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                          : item.status === 'Scheduled'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                          : 'bg-gray-100 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3] border-gray-200 dark:border-[#3A3E43]'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/requests"
                        className="text-xs font-semibold text-forest dark:text-[#FF7028] hover:underline"
                      >
                        Track →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Realistic Empty State */
          <div className="py-16 px-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6 text-forest-700 dark:text-[#FF7028]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                No E-Waste Requests Submitted Yet
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#B8BDC3] max-w-sm mx-auto leading-relaxed">
                You haven't registered any electronic equipment for disposal. Submit an item declaration to generate a tracking ID and follow its recovery lifecycle.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register"
                className="btn-primary text-xs px-5 py-2.5 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register First E-Waste Item</span>
              </Link>
              <Link
                to="/centers"
                onClick={(e) => {
                  e.preventDefault();
                  openDirectory('Personal Dashboard');
                }}
                className="btn-secondary text-xs px-5 py-2.5 font-semibold"
              >
                Browse Collection Centers
              </Link>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
