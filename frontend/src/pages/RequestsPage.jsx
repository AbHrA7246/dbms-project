import React, { useState, useEffect, useMemo } from 'react';
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
  Scale,
  XCircle,
  AlertCircle,
  X,
  Edit3,
  MapPin,
  Eye,
  EyeOff,
  RotateCcw,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStepIndex, storageService, isEligibleForHistoryHiding, validateServiceArea } from '../services/storageService';
import { geocodeAddress, formatCoordinates } from '../services/geocodingService';

const PAGE_SIZE = 10;

export default function RequestsPage() {
  const {
    user,
    getUserRequests,
    cancelUserRequest,
    respondToAppointment,
    updatePickupDetails,
    hideUserRequest,
    hideUserRequests,
    clearUserHistory,
    restoreUserRequest,
    restoreUserRequests,
    restoreAllUserHistory,
  } = useAuth();

  const [allRequests, setAllRequests] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [viewTab, setViewTab] = useState('active'); // 'active' | 'history' | 'archive'
  const [centres] = useState(() => storageService.getCentres());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Batch Selection
  const [selectedBatchIds, setSelectedBatchIds] = useState(new Set());

  // Feedback & Modal States
  const [statusUpdateMsg, setStatusUpdateMsg] = useState('');
  const [showRescheduleInput, setShowRescheduleInput] = useState(false);
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Clear History Confirmation Modal State
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showBatchHideModal, setShowBatchHideModal] = useState(false);
  const [showSingleHideModal, setShowSingleHideModal] = useState(false);
  const [recordToHide, setRecordToHide] = useState(null);

  // Edit pickup address modal state
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAddressError, setEditAddressError] = useState('');
  const [editCoordinates, setEditCoordinates] = useState(null);
  const [editGeocodingStatus, setEditGeocodingStatus] = useState('idle');
  const [editGeocodingFeedback, setEditGeocodingFeedback] = useState('');
  const [editSuggestedAddress, setEditSuggestedAddress] = useState('');

  const loadRequests = () => {
    if (user?.email) {
      const records = storageService.getRequests(user.email);
      setAllRequests(records);
    }
  };

  useEffect(() => {
    loadRequests();

    const handleUpdate = () => loadRequests();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('ecocycle_storage_update', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('ecocycle_storage_update', handleUpdate);
    };
  }, [user]);

  // Compute hidden IDs set
  const hiddenIdsSet = useMemo(() => {
    if (!user?.email) return new Set();
    return new Set(storageService.getCustomerHiddenIds(user.email));
  }, [allRequests, user?.email]);

  // Separate records into:
  // 1. Active Dispatches (Submitted, Accepted, Schedule Proposed, Scheduled, In Transit) - never hidden
  // 2. Visible History (terminal records not in hidden set)
  // 3. Hidden Archive (terminal records in hidden set)
  const activeDispatches = useMemo(() => {
    return allRequests.filter((r) => !isEligibleForHistoryHiding(r.status));
  }, [allRequests]);

  const visibleHistory = useMemo(() => {
    return allRequests.filter(
      (r) => isEligibleForHistoryHiding(r.status) && !hiddenIdsSet.has(r.id)
    );
  }, [allRequests, hiddenIdsSet]);

  const hiddenArchive = useMemo(() => {
    return allRequests.filter(
      (r) => isEligibleForHistoryHiding(r.status) && hiddenIdsSet.has(r.id)
    );
  }, [allRequests, hiddenIdsSet]);

  // Choose active dataset based on viewTab
  const currentTabRecords = useMemo(() => {
    if (viewTab === 'active') return activeDispatches;
    if (viewTab === 'history') return visibleHistory;
    return hiddenArchive;
  }, [viewTab, activeDispatches, visibleHistory, hiddenArchive]);

  // Apply Search, Category, and Status Filters
  const filteredRecords = useMemo(() => {
    return currentTabRecords.filter((r) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.items.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.center && r.center.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.category && r.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        categoryFilter === 'all' || (r.category && r.category.toLowerCase() === categoryFilter.toLowerCase());

      const matchesStat =
        statusFilter === 'all' || r.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesCat && matchesStat;
    });
  }, [currentTabRecords, searchQuery, categoryFilter, statusFilter]);

  // Reset page when tab or filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedBatchIds(new Set());
  }, [viewTab, searchQuery, categoryFilter, statusFilter]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, currentPage]);

  // Currently focused active request manifest
  const activeRequest = useMemo(() => {
    if (selectedId) {
      const found = allRequests.find((r) => r.id === selectedId);
      if (found) return found;
    }
    return paginatedRecords[0] || allRequests[0] || null;
  }, [allRequests, selectedId, paginatedRecords]);

  // Trigger feedback banner
  const triggerBanner = (msg) => {
    setStatusUpdateMsg(msg);
    setTimeout(() => setStatusUpdateMsg(''), 4000);
  };

  // History Visibility Handlers
  const handleHideSingle = (idOrReq) => {
    const req =
      typeof idOrReq === 'object' && idOrReq !== null
        ? idOrReq
        : allRequests.find((r) => r.id === idOrReq) || { id: idOrReq };
    setRecordToHide(req);
    setShowSingleHideModal(true);
  };

  const handleConfirmHideSingle = () => {
    if (!recordToHide) return;
    try {
      hideUserRequest(recordToHide.id);
      triggerBanner(`Request #${recordToHide.id} has been hidden from your personal history.`);
      setShowSingleHideModal(false);
      setRecordToHide(null);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenBatchHideModal = () => {
    if (selectedBatchIds.size === 0) return;
    setShowBatchHideModal(true);
  };

  const handleConfirmBatchHide = () => {
    if (selectedBatchIds.size === 0) return;
    try {
      const ids = Array.from(selectedBatchIds);
      hideUserRequests(ids);
      setSelectedBatchIds(new Set());
      setShowBatchHideModal(false);
      triggerBanner(`${ids.length} historical record(s) hidden from your personal history.`);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirmClearAllHistory = () => {
    try {
      const count = visibleHistory.length;
      clearUserHistory();
      setShowClearHistoryModal(false);
      setSelectedBatchIds(new Set());
      triggerBanner(`All ${count} eligible historical records have been hidden from your view.`);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestoreSingle = (id) => {
    try {
      restoreUserRequest(id);
      triggerBanner(`Request #${id} restored to your personal history view.`);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestoreBatch = () => {
    if (selectedBatchIds.size === 0) return;
    try {
      const ids = Array.from(selectedBatchIds);
      restoreUserRequests(ids);
      setSelectedBatchIds(new Set());
      triggerBanner(`${ids.length} record(s) restored to your history view.`);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestoreAll = () => {
    try {
      const count = hiddenArchive.length;
      restoreAllUserHistory();
      setSelectedBatchIds(new Set());
      triggerBanner(`All ${count} hidden records restored to your personal history.`);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle selection for batch actions
  const handleToggleSelectId = (id) => {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAllOnPage = () => {
    const pageIds = paginatedRecords.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedBatchIds.has(id));
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Existing Appointment Response Handlers
  const handleCustomerAppointmentResponse = (type) => {
    if (!activeRequest) return;
    try {
      respondToAppointment(activeRequest.id, type, rescheduleNote);
      setShowRescheduleInput(false);
      setRescheduleNote('');
      loadRequests();
      triggerBanner(
        type === 'confirm'
          ? 'Appointment slot confirmed! The facility has been notified.'
          : type === 'reschedule'
          ? 'Rescheduling request submitted to the centre.'
          : 'Appointment proposal declined.'
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirmCancel = (e) => {
    e.preventDefault();
    if (!activeRequest) return;
    try {
      cancelUserRequest(activeRequest.id, cancelReason);
      setShowCancelModal(false);
      setCancelReason('');
      setCancelError('');
      loadRequests();
      triggerBanner(`Disposal request #${activeRequest.id} cancelled. Reserved facility capacity released.`);
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel request.');
    }
  };

  const handleOpenEditAddress = () => {
    if (!activeRequest) return;
    setEditAddress(activeRequest.address || '');
    setEditNotes(activeRequest.notes || '');
    setEditCoordinates(activeRequest.coordinates || null);
    setEditGeocodingStatus(activeRequest.coordinates ? 'verified' : 'idle');
    setEditGeocodingFeedback(activeRequest.coordinates ? `Coordinates: ${formatCoordinates(activeRequest.coordinates)}` : '');
    setEditSuggestedAddress('');
    setEditAddressError('');
    setShowEditAddressModal(true);
  };

  const handleLookupEditAddress = async () => {
    if (!editAddress || editAddress.trim().length < 3) {
      setEditGeocodingStatus('error');
      setEditGeocodingFeedback('Please enter an address before verifying location.');
      return;
    }
    setEditGeocodingStatus('loading');
    setEditGeocodingFeedback('');
    try {
      const res = await geocodeAddress(editAddress);
      if (res.success && res.data) {
        setEditGeocodingStatus('verified');
        setEditCoordinates(res.data);
        setEditGeocodingFeedback(`Coordinates verified: ${formatCoordinates(res.data)}`);
        if (res.data.formattedAddress && res.data.formattedAddress.toLowerCase() !== editAddress.trim().toLowerCase()) {
          setEditSuggestedAddress(res.data.formattedAddress);
        } else {
          setEditSuggestedAddress('');
        }
      } else if (res.status === 'unconfigured') {
        setEditGeocodingStatus('unconfigured');
        setEditGeocodingFeedback('Geocoding inactive (API key unconfigured). Manual address accepted.');
        setEditCoordinates(null);
      } else {
        setEditGeocodingStatus(res.status || 'error');
        setEditGeocodingFeedback(res.message || 'Could not verify coordinates.');
        setEditCoordinates(null);
      }
    } catch {
      setEditGeocodingStatus('error');
      setEditGeocodingFeedback('Geocoding lookup failed. Manual address will be used.');
      setEditCoordinates(null);
    }
  };

  const handleSaveEditedAddress = (e) => {
    e.preventDefault();
    setEditAddressError('');
    if (!editAddress.trim() || editAddress.trim().length < 5) {
      setEditAddressError('Please provide a complete street address (minimum 5 characters).');
      return;
    }
    try {
      updatePickupDetails(activeRequest.id, {
        address: editAddress.trim(),
        notes: editNotes.trim(),
        coordinates: editCoordinates,
      });
      setShowEditAddressModal(false);
      loadRequests();
      triggerBanner(`Pickup address for declaration #${activeRequest.id} has been updated.`);
    } catch (err) {
      setEditAddressError(err.message || 'Failed to update pickup address.');
    }
  };

  const steps = [
    {
      title: 'Submitted',
      desc: 'Customer declaration submitted',
    },
    {
      title: 'Scheduled',
      desc: activeRequest?.method === 'pickup' ? 'Collection slot reserved' : 'Drop-off slot reserved',
    },
    {
      title: 'Received',
      desc: 'Physically received at centre',
    },
  ];

  const currentStepIndex = activeRequest ? getStepIndex(activeRequest.status) : 0;

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#3A3E43]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
              Collection Request Tracking
            </h1>
            <span className="text-xs font-mono font-medium text-gray-500 dark:text-[#B8BDC3] bg-gray-100 dark:bg-[#202326] px-2 py-0.5 rounded border border-gray-200 dark:border-[#3A3E43]">
              {user?.email}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-[#B8BDC3]">
            Monitor real-time custody stages, facility appointments, and individual history visibility for submitted equipment.
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

      {statusUpdateMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{statusUpdateMsg}</span>
        </div>
      )}

      {/* Primary Section Tabs: Active Dispatches vs Disposal History vs Hidden Archive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-[#3A3E43] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewTab('active')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              viewTab === 'active'
                ? 'bg-forest dark:bg-[#FF7028] text-white shadow-xs'
                : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] hover:bg-gray-100 dark:hover:bg-[#202326]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Active Dispatches</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                viewTab === 'active' ? 'bg-forest-800 dark:bg-[#F45D16] text-white' : 'bg-gray-200 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3]'
              }`}
            >
              {activeDispatches.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              viewTab === 'history'
                ? 'bg-forest dark:bg-[#FF7028] text-white shadow-xs'
                : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] hover:bg-gray-100 dark:hover:bg-[#202326]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Disposal History</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                viewTab === 'history' ? 'bg-forest-800 dark:bg-[#F45D16] text-white' : 'bg-gray-200 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3]'
              }`}
            >
              {visibleHistory.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('archive')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              viewTab === 'archive'
                ? 'bg-forest dark:bg-[#FF7028] text-white shadow-xs'
                : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] hover:bg-gray-100 dark:hover:bg-[#202326]'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Hidden Archive</span>
            {hiddenArchive.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  viewTab === 'archive' ? 'bg-forest-800 dark:bg-[#F45D16] text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                }`}
              >
                {hiddenArchive.length}
              </span>
            )}
          </button>
        </div>

        {/* Batch & Clearing Actions (Visible when relevant) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {viewTab === 'history' && (
            <>
              {selectedBatchIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleOpenBatchHideModal}
                  className="px-3 py-1.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide Selected ({selectedBatchIds.size})</span>
                </button>
              )}
              {visibleHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearHistoryModal(true)}
                  className="px-3 py-1.5 rounded-md bg-white dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3] border border-gray-300 dark:border-[#3A3E43] text-xs font-semibold hover:bg-gray-50 dark:hover:bg-[#292D31] hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                  <span>Clear All History</span>
                </button>
              )}
            </>
          )}

          {viewTab === 'archive' && hiddenArchive.length > 0 && (
            <>
              {selectedBatchIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleRestoreBatch}
                  className="btn-primary text-xs px-3 py-1.5 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Selected ({selectedBatchIds.size})</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleRestoreAll}
                className="btn-secondary text-xs px-3 py-1.5 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore All Records</span>
              </button>
            </>
          )}
        </div>
      </div>

      {allRequests.length > 0 ? (
        <div className="space-y-6">
          {/* Filter Bar: Search, Category, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, equipment, or centre..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-gray-50/50 dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
              />
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-gray-50/50 dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
              >
                <option value="all" className="dark:bg-[#202326]">All Waste Streams</option>
                <option value="Computers & Laptops" className="dark:bg-[#202326]">Computers &amp; Laptops</option>
                <option value="Smartphones & Tablets" className="dark:bg-[#202326]">Smartphones &amp; Tablets</option>
                <option value="Batteries & Power Units" className="dark:bg-[#202326]">Batteries &amp; Power Units</option>
                <option value="Displays & Monitors" className="dark:bg-[#202326]">Displays &amp; Monitors</option>
                <option value="Home & Office Appliances" className="dark:bg-[#202326]">Home &amp; Office Appliances</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-gray-50/50 dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
              >
                <option value="all" className="dark:bg-[#202326]">All Lifecycle Statuses</option>
                <option value="Submitted" className="dark:bg-[#202326]">Submitted</option>
                <option value="Scheduled" className="dark:bg-[#202326]">Scheduled</option>
                <option value="In Transit" className="dark:bg-[#202326]">In Transit</option>
                <option value="Received" className="dark:bg-[#202326]">Received</option>
                <option value="Cancelled" className="dark:bg-[#202326]">Cancelled</option>
                <option value="Rejected" className="dark:bg-[#202326]">Rejected</option>
              </select>
            </div>
          </div>

          {/* Master-Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Requests List (5 Cols) */}
            <div className="lg:col-span-5 space-y-3">
              {/* Batch Select All Row (in history or archive views) */}
              {(viewTab === 'history' || viewTab === 'archive') && paginatedRecords.length > 0 && (
                <div className="flex items-center justify-between px-2 text-xs text-gray-500 dark:text-[#B8BDC3]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={
                        paginatedRecords.length > 0 &&
                        paginatedRecords.every((r) => selectedBatchIds.has(r.id))
                      }
                      onChange={handleToggleSelectAllOnPage}
                      className="rounded text-forest dark:accent-[#FF7028] border-gray-300 dark:border-[#3A3E43] focus:ring-forest dark:focus:ring-[#FF7028] w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-medium">Select page records</span>
                  </label>
                  <span className="text-[11px]">
                    Showing {paginatedRecords.length} of {filteredRecords.length}
                  </span>
                </div>
              )}

              {paginatedRecords.length > 0 ? (
                <div className="space-y-3">
                  {paginatedRecords.map((req) => {
                    const isSelected = activeRequest && req.id === activeRequest.id;
                    const isBatchSelected = selectedBatchIds.has(req.id);
                    const canHide = isEligibleForHistoryHiding(req.status);

                    return (
                      <div
                        key={req.id}
                        className={`rounded-xl border transition-all relative ${
                          isSelected
                            ? 'border-forest dark:border-[#FF7028] bg-white dark:bg-[#202326] ring-2 ring-forest/20 dark:ring-[#FF7028]/20 shadow-xs'
                            : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-gray-300 dark:hover:border-[#FF7028]/40'
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {(viewTab === 'history' || viewTab === 'archive') && (
                                <input
                                  type="checkbox"
                                  checked={isBatchSelected}
                                  onChange={() => handleToggleSelectId(req.id)}
                                  className="rounded text-forest dark:accent-[#FF7028] border-gray-300 dark:border-[#3A3E43] focus:ring-forest dark:focus:ring-[#FF7028] w-3.5 h-3.5"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedId(req.id)}
                                className="font-mono text-xs font-bold text-forest dark:text-[#FF7028] hover:underline"
                              >
                                #{req.id}
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                  req.status === 'Completed' || req.status === 'Recycled'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    : req.status === 'In Transit'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                    : req.status === 'Received' || req.status === 'Drop-off Completed'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    : req.status === 'Processing'
                                    ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
                                    : req.status === 'Scheduled' || req.status === 'Confirmed'
                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                    : req.status === 'Rejected'
                                    ? 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                                    : req.status === 'Cancelled'
                                    ? 'bg-gray-100 dark:bg-[#202326] text-gray-600 dark:text-[#B8BDC3] border-gray-300 dark:border-[#3A3E43]'
                                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                {req.status}
                              </span>

                              {/* Individual Visibility Control */}
                              {viewTab === 'history' && canHide && (
                                <button
                                  type="button"
                                  onClick={() => handleHideSingle(req.id)}
                                  title="Hide from personal history view (preserves original record)"
                                  className="p-1 rounded text-gray-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-[#202326] transition-colors"
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {viewTab === 'archive' && (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreSingle(req.id)}
                                  title="Restore to history view"
                                  className="p-1 rounded text-gray-400 hover:text-forest dark:hover:text-[#FF7028] hover:bg-gray-100 dark:hover:bg-[#202326] transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div
                            onClick={() => setSelectedId(req.id)}
                            className="cursor-pointer"
                          >
                            <h4 className="text-sm font-semibold text-charcoal dark:text-[#F5F5F5] truncate">
                              {req.items}
                            </h4>
                            <div className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-1 flex items-center justify-between">
                              <span className="truncate max-w-[180px]">{req.center || 'Assigned Facility'}</span>
                              <span>{req.date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl space-y-2">
                  <FolderOpen className="w-8 h-8 text-gray-400 mx-auto" />
                  <div className="text-xs font-semibold text-charcoal dark:text-[#F5F5F5]">
                    {viewTab === 'active'
                      ? 'No active dispatches found.'
                      : viewTab === 'history'
                      ? 'No historical requests to display.'
                      : 'No hidden records in archive.'}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                    {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try clearing your filters or search query.'
                      : viewTab === 'history'
                      ? 'Completed, received, or cancelled requests will appear here.'
                      : ''}
                  </p>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 px-1 text-xs">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded border border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#292D31]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-gray-600 dark:text-[#B8BDC3]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded border border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#292D31]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Active Request Detailed Manifest (7 Cols) */}
            {activeRequest ? (
              <div className="lg:col-span-7 bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-[#3A3E43]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-forest dark:text-[#FF7028]">
                        #{activeRequest.id}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] border border-forest-200 dark:border-[#3A3E43]">
                        {activeRequest.status}
                      </span>
                      {hiddenIdsSet.has(activeRequest.id) && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Hidden from History
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-charcoal dark:text-[#F5F5F5] mt-1">
                      {activeRequest.items}
                    </h2>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-[#B8BDC3]">
                    Submitted: {activeRequest.date}
                  </span>
                </div>

                {/* Simplified 3-Stage Progress Stepper */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-[#B8BDC3] uppercase tracking-wider block">
                      Disposal Progression ({activeRequest.method === 'pickup' ? 'Doorstep Courier Flow' : 'Depot Drop-off Flow'})
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-[#B8BDC3]">
                      Managed by {activeRequest.center}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {steps.map((st, idx) => {
                      const isPassed = currentStepIndex >= 0 && idx <= currentStepIndex;
                      const isCurrent = currentStepIndex >= 0 && idx === currentStepIndex;
                      return (
                        <div
                          key={st.title}
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            isCurrent
                              ? 'bg-forest-50 dark:bg-[#202326] border-forest dark:border-[#FF7028] text-forest dark:text-[#FF7028] font-semibold ring-1 ring-forest/30 dark:ring-[#FF7028]/30'
                              : isPassed
                              ? 'bg-sage-100/50 dark:bg-[#202326] border-forest-200 dark:border-[#3A3E43] text-charcoal dark:text-[#F5F5F5]'
                              : 'bg-white dark:bg-[#202326] border-gray-200 dark:border-[#3A3E43] text-gray-400 dark:text-[#B8BDC3]'
                          }`}
                        >
                          <div className="text-xs font-bold">{st.title}</div>
                          <div className="text-[10px] text-gray-500 dark:text-[#B8BDC3] mt-0.5 leading-tight">
                            {st.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cancellation Alert if Cancelled */}
                {activeRequest.status === 'Cancelled' && (
                  <div className="p-4 rounded-xl bg-gray-100 dark:bg-[#202326] border border-gray-300 dark:border-[#3A3E43] text-gray-800 dark:text-[#F5F5F5] text-xs space-y-1.5">
                    <div className="font-bold text-sm flex items-center gap-1.5 text-gray-700 dark:text-[#F5F5F5]">
                      <XCircle className="w-4 h-4 text-gray-600 dark:text-[#B8BDC3] shrink-0" />
                      <span>Disposal Request Cancelled</span>
                    </div>
                    <p className="text-xs leading-relaxed">
                      <strong>Cancellation Reason:</strong> "{activeRequest.cancellationReason || 'Cancelled by customer'}"
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                      Reserved facility processing capacity has been released. You may register another item at any time.
                    </p>
                  </div>
                )}

                {/* Rejection Alert if Rejected by Centre */}
                {activeRequest.status === 'Rejected' && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-300 text-xs space-y-1.5">
                    <div className="font-bold text-sm flex items-center gap-1.5 text-red-700 dark:text-red-400">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Declaration Rejected by {activeRequest.center}</span>
                    </div>
                    {activeRequest.rejectionReason && (
                      <p className="text-xs leading-relaxed text-red-800 dark:text-red-200">
                        <strong>Facility Reason:</strong> "{activeRequest.rejectionReason}"
                      </p>
                    )}
                    <p className="text-[11px] text-red-600 dark:text-red-400">
                      Reserved facility capacity has been released. You may submit a revised declaration or choose an alternative facility.
                    </p>
                  </div>
                )}

                {/* Confirmed Appointment Details Card */}
                {activeRequest.appointment && (
                  <div className="p-5 rounded-xl border border-[#FFE6D5] dark:border-[#3A3E43] bg-[#FFF3EB] dark:bg-[#202326] text-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#FFE6D5] dark:border-[#3A3E43]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#F45D16] dark:text-[#FF7028]" />
                        <span className="font-bold text-sm text-charcoal dark:text-[#F5F5F5]">
                          Confirmed Intake Appointment
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeRequest.appointment.bookingRef && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-[#292D31] border border-[#FFE6D5] dark:border-[#3A3E43] text-[#F45D16] dark:text-[#FF7028]">
                            Ref: {activeRequest.appointment.bookingRef}
                          </span>
                        )}
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#F45D16] dark:bg-[#FF7028] text-white">
                          {activeRequest.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-[#B8BDC3] block mb-0.5">Appointment Date</span>
                        <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">{activeRequest.appointment.date}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-[#B8BDC3] block mb-0.5">Time Window</span>
                        <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">{activeRequest.appointment.timeSlot}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Proposed Appointment Slot Action Banner */}
                {activeRequest.status === 'Schedule Proposed' && activeRequest.appointment && (
                  <div className="p-5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/40 text-xs space-y-3">
                    <div className="flex items-center gap-2 font-bold text-sm text-purple-900 dark:text-purple-300">
                      <Clock className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                      <span>Facility Proposed Appointment Slot</span>
                    </div>
                    <p className="text-purple-800 dark:text-purple-300 leading-relaxed">
                      The facility has proposed <strong>{activeRequest.appointment.date} ({activeRequest.appointment.timeSlot})</strong>. Please confirm or request an alternate time window.
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleCustomerAppointmentResponse('confirm')}
                        className="btn-primary text-xs px-4 py-2 font-semibold shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Appointment Slot</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRescheduleInput(!showRescheduleInput)}
                        className="btn-secondary text-xs px-4 py-2 font-semibold"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Request Alternate Slot</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCustomerAppointmentResponse('decline')}
                        className="px-3 py-2 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        Decline
                      </button>
                    </div>

                    {showRescheduleInput && (
                      <div className="pt-3 border-t border-purple-200 dark:border-purple-900/60 space-y-2">
                        <label className="block text-[11px] font-semibold text-purple-900 dark:text-purple-300">
                          Preferred days / alternate dates:
                        </label>
                        <input
                          type="text"
                          value={rescheduleNote}
                          onChange={(e) => setRescheduleNote(e.target.value)}
                          placeholder="e.g. Prefer Friday morning or next Monday afternoon"
                          className="w-full text-xs p-2.5 border border-purple-300 dark:border-purple-800 rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCustomerAppointmentResponse('reschedule')}
                          className="btn-primary text-xs px-4 py-1.5"
                        >
                          Submit Reschedule Request
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Manifest Specifications Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-gray-100 dark:border-[#3A3E43]">
                  <div>
                    <span className="text-gray-500 dark:text-[#B8BDC3] block mb-0.5">Disposal Service Mode</span>
                    <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">{activeRequest.channel}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-[#B8BDC3] block mb-0.5">Assigned Facility</span>
                    <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">{activeRequest.center}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-[#B8BDC3] block mb-0.5">Quantity &amp; Weight</span>
                    <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">
                      {activeRequest.quantity} unit(s) • ~{activeRequest.weight} kg
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-gray-500 dark:text-[#B8BDC3]">Location / Intake Point</span>
                      {activeRequest.method === 'pickup' &&
                        ['Submitted', 'Scheduled', 'Accepted', 'Schedule Proposed', 'Confirmed'].includes(
                          activeRequest.status
                        ) && (
                          <button
                            type="button"
                            onClick={handleOpenEditAddress}
                            className="text-[11px] font-semibold text-forest dark:text-[#FF7028] hover:underline inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Details</span>
                          </button>
                        )}
                    </div>
                    <span className="font-semibold text-charcoal dark:text-[#F5F5F5] truncate block">
                      {storageService.getRequestDisplayAddress(activeRequest, centres)}
                    </span>
                    {activeRequest.coordinates && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Coordinates: {formatCoordinates(activeRequest.coordinates)} (Geoapify)</span>
                      </span>
                    )}
                  </div>

                  {activeRequest.notes && (
                    <div className="sm:col-span-2 pt-2 border-t border-gray-200 dark:border-[#3A3E43]">
                      <span className="text-gray-500 dark:text-[#B8BDC3] block mb-0.5">Declaration Notes</span>
                      <span className="text-charcoal dark:text-[#F5F5F5] italic">{activeRequest.notes}</span>
                    </div>
                  )}
                </div>

                {/* Cancel Request Action Button (Only on active dispatches) */}
                {['Submitted', 'Scheduled', 'Accepted', 'Schedule Proposed'].includes(activeRequest.status) && (
                  <div className="pt-4 border-t border-gray-100 dark:border-[#3A3E43] flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-[#B8BDC3]">
                      Need to cancel or revise this declaration?
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="px-3.5 py-1.5 rounded-lg border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors"
                    >
                      Cancel Declaration
                    </button>
                  </div>
                )}

                {/* Chain-of-Custody Activity Log */}
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-[#3A3E43]">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-[#B8BDC3] uppercase tracking-wider">
                    Chain-of-Custody Log
                  </h3>
                  <div className="space-y-2">
                    {activeRequest.history?.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 text-xs bg-gray-50/50 dark:bg-[#202326] p-2 rounded-lg border border-gray-100 dark:border-[#3A3E43]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-forest dark:text-[#FF7028] mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">{h.time}</span>
                          <span className="text-gray-600 dark:text-[#B8BDC3] block sm:inline sm:ml-2">— {h.event}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* Realistic Empty State (No Seed Data) */
        <div className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-16 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] flex items-center justify-center mx-auto shadow-xs">
            <FolderOpen className="w-7 h-7 text-forest-700 dark:text-[#FF7028]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-charcoal dark:text-[#F5F5F5]">
              No Collection Requests on Record
            </h2>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3] max-w-sm mx-auto leading-relaxed">
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

      {/* ── MODAL: Clear All History Confirmation Dialog ── */}
      {showClearHistoryModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200 dark:border-[#3A3E43] animate-fadeIn">
            <div className="flex items-center gap-2 text-charcoal dark:text-[#F5F5F5]">
              <Archive className="w-5 h-5 text-forest dark:text-[#FF7028]" />
              <h3 className="text-base font-bold">Clear Personal History View</h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              You are about to hide <strong>{visibleHistory.length} completed historical records</strong> from your personal history list.
            </p>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Original Records &amp; Environmental Impact Preserved</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Hiding history does not delete original transaction records or alter their lifecycle status. Your environmental impact contributions remain permanently recorded and aggregated on the public platform.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#3A3E43]">
              <button
                type="button"
                onClick={() => setShowClearHistoryModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAllHistory}
                className="btn-primary text-xs px-4 py-2 font-semibold"
              >
                Confirm &amp; Hide Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Batch Hide Personal History Confirmation Dialog ── */}
      {showBatchHideModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200 dark:border-[#3A3E43] animate-fadeIn">
            <div className="flex items-center gap-2 text-charcoal dark:text-[#F5F5F5]">
              <EyeOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-base font-bold">Hide Selected Records</h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              You are about to hide <strong>{selectedBatchIds.size} completed historical record(s)</strong> from your personal history list.
            </p>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Original Records &amp; Environmental Impact Preserved</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Hiding is a personal view preference. Master transaction manifests and your public cumulative environmental impact contributions remain permanently preserved. You can restore hidden records from the Hidden Archive tab at any time.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#3A3E43]">
              <button
                type="button"
                onClick={() => setShowBatchHideModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchHide}
                className="btn-primary text-xs px-4 py-2 font-semibold"
              >
                Confirm &amp; Hide Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Single Record Hide Confirmation Dialog ── */}
      {showSingleHideModal && recordToHide && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200 dark:border-[#3A3E43] animate-fadeIn">
            <div className="flex items-center gap-2 text-charcoal dark:text-[#F5F5F5]">
              <EyeOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-base font-bold">Hide Record from Personal History</h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              Are you sure you want to hide request <strong>#{recordToHide.id}</strong>{recordToHide.brand ? ` (${recordToHide.brand} ${recordToHide.model})` : ''} from your personal history list?
            </p>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Original Record &amp; Environmental Impact Preserved</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Hiding changes your visible history only. Original transaction records and cumulative environmental impact statistics remain completely unaffected. Hidden records remain preserved in your permanent archive and can be restored at any time.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#3A3E43]">
              <button
                type="button"
                onClick={() => {
                  setShowSingleHideModal(false);
                  setRecordToHide(null);
                }}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHideSingle}
                className="btn-primary text-xs px-4 py-2 font-semibold"
              >
                Confirm &amp; Hide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Customer Cancellation Confirmation Dialog ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200 dark:border-[#3A3E43] animate-fadeIn">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">Cancel Disposal Declaration</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              Are you sure you want to cancel request <strong>#{activeRequest?.id}</strong>? Any reserved appointment slot and facility capacity will be immediately released.
            </p>

            {cancelError && (
              <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-xs">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Repaired the device, rescheduled moving plans, or found alternate donation."
                  className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Keep Request Active
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Customer Pickup Address Editing Dialog ── */}
      {showEditAddressModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200 dark:border-[#3A3E43] animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                  Update Pickup Address &amp; Instructions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditAddressModal(false)}
                className="text-gray-400 hover:text-charcoal dark:hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-[#B8BDC3]">
              Updating pickup location for declaration <strong>#{activeRequest?.id}</strong>. Both the customer manifest and facility courier dispatch records will be synchronized.
            </p>

            {editAddressError && (
              <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editAddressError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditedAddress} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                  Street Address &amp; Unit Number *
                </label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => {
                    setEditAddress(e.target.value);
                    setEditCoordinates(null);
                    setEditGeocodingStatus('idle');
                    setEditGeocodingFeedback('');
                    setEditSuggestedAddress('');
                  }}
                  placeholder="e.g. Flat 402, Green Glen Towers, Outer Ring Road, Bangalore"
                  className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
                />

                {/* Geocoding Controls */}
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLookupEditAddress}
                      disabled={editGeocodingStatus === 'loading' || !editAddress || editAddress.trim().length < 3}
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded border border-forest-600/40 dark:border-[#FF7028]/60 text-forest-700 dark:text-[#FF7028] bg-forest-50/50 dark:bg-[#202326] hover:bg-forest-100/60 dark:hover:bg-[#FF7028]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{editGeocodingStatus === 'loading' ? 'Verifying...' : 'Verify Coordinates'}</span>
                    </button>

                    {editGeocodingStatus === 'verified' && editCoordinates && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Coordinates: {formatCoordinates(editCoordinates)}</span>
                      </span>
                    )}

                    {editGeocodingStatus === 'unconfigured' && (
                      <span className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                        Geocoding unconfigured.
                      </span>
                    )}

                    {(editGeocodingStatus === 'not_found' || editGeocodingStatus === 'error' || editGeocodingStatus === 'rate_limited') && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400">
                        {editGeocodingFeedback}
                      </span>
                    )}
                  </div>

                  {editSuggestedAddress && (
                    <div className="p-2 rounded bg-forest-50/70 dark:bg-[#202326] border border-forest-200 dark:border-[#3A3E43] flex items-center justify-between text-xs animate-fadeIn">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-forest-900 dark:text-[#FF7028]">Suggested Format: </span>
                        <span className="text-gray-700 dark:text-[#F5F5F5]">{editSuggestedAddress}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditAddress(editSuggestedAddress);
                          setEditSuggestedAddress('');
                        }}
                        className="shrink-0 px-2 py-0.5 text-[11px] font-semibold bg-forest dark:bg-[#FF7028] text-white rounded hover:bg-forest-700 dark:hover:bg-[#F45D16] transition-colors"
                      >
                        Use Suggestion
                      </button>
                    </div>
                  )}
                </div>

                {(() => {
                  const activeCentre = centres.find(
                    (c) =>
                      c.id === activeRequest?.centreId ||
                      (c.name && activeRequest?.center && c.name.toLowerCase() === activeRequest.center.toLowerCase())
                  );
                  const editServiceArea = activeCentre && editAddress ? validateServiceArea(activeCentre, editAddress) : null;
                  return editAddress.trim().length >= 5 && editServiceArea && !editServiceArea.inArea ? (
                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs space-y-1 animate-fadeIn">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Service Area Advisory</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {editServiceArea.message}
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                  Pickup Instructions / Access Gate Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Ring buzzer 402. Leave hardware with security if unavailable."
                  className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#3A3E43]">
                <button
                  type="button"
                  onClick={() => setShowEditAddressModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-4 py-2 font-semibold shadow-xs"
                >
                  Save &amp; Synchronize Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
