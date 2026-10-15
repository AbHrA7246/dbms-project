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

export default function DashboardPage() {
  const { user, getUserRequests } = useAuth();
  const [requests, setRequests] = useState([]);

  // Fetch actual saved records on mount and when user changes
  useEffect(() => {
    if (user?.email) {
      const records = getUserRequests();
      setRequests(records);
    }
  }, [user]);

  // Derived real metrics from actual submitted records
  const totalItems = requests.length;
  const activeDispatches = requests.filter((r) => r.status !== 'Recycled').length;
  const certifiedRecycled = requests.filter((r) => r.status === 'Recycled').length;
  const totalWeight = requests
    .reduce((sum, r) => sum + (Number(r.weight) || 0), 0)
    .toFixed(1);

  const summaryCards = [
    {
      label: 'Registered Items',
      count: `${totalItems} ${totalItems === 1 ? 'Item' : 'Items'}`,
      desc: 'Originating from your submissions',
      icon: Package,
    },
    {
      label: 'Active Dispatches',
      count: `${activeDispatches} In Progress`,
      desc: 'Submitted, Scheduled, or In Transit',
      icon: Truck,
    },
    {
      label: 'Certified Disposals',
      count: `${certifiedRecycled} Completed`,
      desc: 'Verified circular refining complete',
      icon: CheckCircle2,
    },
    {
      label: 'Estimated Mass',
      count: `${totalWeight} kg`,
      desc: 'Total declared hardware weight',
      icon: Scale,
    },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 page-enter">

      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal">
            Personal Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Account: <strong>{user?.email}</strong> • Affiliation: <span className="font-medium text-charcoal">{user?.userType}</span>
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

      {/* Persistence Info Banner */}
      <div className="p-3.5 rounded-md bg-forest-50 border border-forest-100 text-forest-900 text-xs flex items-center gap-2.5">
        <Info className="w-4 h-4 text-forest shrink-0" />
        <span>
          <strong>Live Persistence:</strong> Metrics and records displayed below are computed strictly from your manually submitted declarations in local storage.
        </span>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-gray-200/90 rounded-xl p-6 space-y-2 shadow-xs card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className="w-8 h-8 rounded-lg bg-forest-50 text-forest flex items-center justify-center">
                  <Icon className="w-4 h-4 text-forest-700" />
                </div>
              </div>
              <div className="text-2xl font-bold text-charcoal tracking-tight">
                {card.count}
              </div>
              <p className="text-xs text-gray-500">
                {card.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Dispatches Section */}
      <div className="bg-white border border-gray-200/90 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-charcoal">
              Your E-Waste Submissions
            </h2>
            <p className="text-xs text-gray-500">
              Real-time record log persisted across sessions
            </p>
          </div>
          {requests.length > 0 && (
            <Link to="/requests" className="text-xs font-semibold text-forest hover:underline flex items-center gap-1">
              <span>Open tracking workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-offwhite text-gray-500 text-xs font-medium uppercase tracking-wider">
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
              <tbody className="divide-y divide-gray-100 bg-white">
                {requests.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-forest">
                      #{item.id}
                    </td>
                    <td className="px-6 py-4 font-medium text-charcoal">
                      {item.items}
                      <span className="text-[11px] text-gray-400 block font-normal capitalize">
                        {item.condition} condition • {item.weight} kg
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 truncate max-w-xs">
                      {item.center}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {item.channel}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {item.date}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${
                        item.status === 'Recycled'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.status === 'In Transit'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : item.status === 'Scheduled'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/requests"
                        className="text-xs font-semibold text-forest hover:underline"
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
            <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6 text-forest-700" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-charcoal">
                No E-Waste Requests Submitted Yet
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
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
                className="btn-secondary text-xs px-5 py-2.5"
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
