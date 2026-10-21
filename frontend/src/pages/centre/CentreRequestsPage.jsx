import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Inbox, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Truck, 
  MapPin, 
  Clock, 
  AlertCircle, 
  FileText, 
  Filter, 
  Phone, 
  User, 
  ShieldCheck, 
  Building2, 
  ArrowRight,
  Eye,
  EyeOff,
  RotateCcw,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { useCentreAuth } from '../../context/CentreAuthContext';
import { storageService, getStepIndex, isEligibleForHistoryHiding } from '../../services/storageService';
import AppointmentCalendarModal from '../../components/centre/AppointmentCalendarModal';

const PAGE_SIZE = 10;

export default function CentreRequestsPage() {
  const {
    currentCentre,
    hideCentreRequest,
    hideCentreRequests,
    clearCentreHistory,
    restoreCentreRequest,
    restoreCentreRequests,
    restoreAllCentreHistory,
  } = useCentreAuth();

  const [searchParams] = useSearchParams();
  const initialStatusFilter = searchParams.get('status') || 'all';
  const initialSelectedId = searchParams.get('selected') || '';

  const [allRequests, setAllRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [viewTab, setViewTab] = useState('active'); // 'active' | 'history' | 'archive'

  // Search, Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [currentPage, setCurrentPage] = useState(1);

  // Batch Selection
  const [selectedBatchIds, setSelectedBatchIds] = useState(new Set());

  // Feedback & Dialog States
  const [bannerMsg, setBannerMsg] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showBatchHideModal, setShowBatchHideModal] = useState(false);
  const [showSingleHideModal, setShowSingleHideModal] = useState(false);
  const [recordToHide, setRecordToHide] = useState(null);

  // Consequential Physical Receipt Confirmation Modal
  const [showReceiveConfirmModal, setShowReceiveConfirmModal] = useState(false);
  const [pendingReceiveAction, setPendingReceiveAction] = useState(null);
  const [isProcessingReceive, setIsProcessingReceive] = useState(false);

  // Appointment Calendar Modal
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMode, setCalendarMode] = useState('book'); // 'book' or 'reschedule'

  const loadRequests = () => {
    if (currentCentre?.id) {
      const centreReqs = storageService.getRequestsForCentre(currentCentre.id);
      setAllRequests(centreReqs);
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
  }, [currentCentre?.id]);

  // Compute hidden IDs set for this specific facility
  const hiddenIdsSet = useMemo(() => {
    if (!currentCentre?.id) return new Set();
    return new Set(storageService.getCentreHiddenIds(currentCentre.id));
  }, [allRequests, currentCentre?.id]);

  // Separate records into:
  // 1. Active Intake Pipeline (Submitted, Schedule Proposed, Scheduled, In Transit) - never hidden
  // 2. Visible History (Received, Completed, Recycled, Rejected, Cancelled)
  // 3. Hidden Archive
  const activePipeline = useMemo(() => {
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
    if (viewTab === 'active') return activePipeline;
    if (viewTab === 'history') return visibleHistory;
    return hiddenArchive;
  }, [viewTab, activePipeline, visibleHistory, hiddenArchive]);

  // Apply Search and Filters
  const filteredRecords = useMemo(() => {
    return currentTabRecords.filter((r) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.items.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.customerName && r.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.userEmail && r.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.category && r.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        categoryFilter === 'all' || (r.category && r.category.toLowerCase() === categoryFilter.toLowerCase());

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'Pending'
          ? ['Submitted', 'Schedule Proposed'].includes(r.status)
          : statusFilter === 'Completed'
          ? ['Completed', 'Recycled', 'Received'].includes(r.status)
          : r.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [currentTabRecords, searchQuery, categoryFilter, statusFilter]);

  // Reset pagination on tab/filter change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedBatchIds(new Set());
  }, [viewTab, searchQuery, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, currentPage]);

  const activeRequest = useMemo(() => {
    if (selectedId) {
      const found = allRequests.find((r) => r.id === selectedId);
      if (found) return found;
    }
    return paginatedRecords[0] || allRequests[0] || null;
  }, [allRequests, selectedId, paginatedRecords]);

  const triggerBanner = (msg) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(''), 4500);
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
      hideCentreRequest(recordToHide.id);
      triggerBanner(`Request #${recordToHide.id} hidden from facility history view.`);
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
      hideCentreRequests(ids);
      setSelectedBatchIds(new Set());
      setShowBatchHideModal(false);
      triggerBanner(`${ids.length} records hidden from facility history view.`);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirmClearAllHistory = () => {
    try {
      const count = visibleHistory.length;
      clearCentreHistory();
      setShowClearHistoryModal(false);
      setSelectedBatchIds(new Set());
      triggerBanner(`All ${count} eligible historical records hidden from facility view.`);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestoreSingle = (id) => {
    try {
      restoreCentreRequest(id);
      triggerBanner(`Request #${id} restored to facility history.`);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestoreBatch = () => {
    if (selectedBatchIds.size === 0) return;
    try {
      const ids = Array.from(selectedBatchIds);
      restoreCentreRequests(ids);
      setSelectedBatchIds(new Set());
      triggerBanner(`${ids.length} records restored to facility history.`);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestoreAll = () => {
    try {
      const count = hiddenArchive.length;
      restoreAllCentreHistory();
      setSelectedBatchIds(new Set());
      triggerBanner(`All ${count} records restored to facility history.`);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle selection
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

  // Staff Action Handlers
  const handleOpenBookModal = () => {
    setCalendarMode('book');
    setShowCalendarModal(true);
  };

  const handleOpenRescheduleModal = () => {
    setCalendarMode('reschedule');
    setShowCalendarModal(true);
  };

  const handleCalendarSuccess = (updated) => {
    triggerBanner(
      `Appointment scheduled for ${updated.appointment.date} (${updated.appointment.timeSlot}) [Ref: ${updated.appointment.bookingRef}]. Capacity successfully reserved.`
    );
    loadRequests();
  };

  const handleAdvanceStatus = (nextStatus, auditNote) => {
    if (!activeRequest || !currentCentre) return;

    if (nextStatus === 'Received') {
      setPendingReceiveAction({ nextStatus, auditNote, request: activeRequest });
      setShowReceiveConfirmModal(true);
      return;
    }

    executeAdvanceStatus(nextStatus, auditNote, activeRequest);
  };

  const executeAdvanceStatus = (nextStatus, auditNote, req) => {
    if (!req || !currentCentre) return;
    try {
      storageService.updateRequestStatusByCentre(
        req.id,
        currentCentre.id,
        nextStatus,
        auditNote
      );
      triggerBanner(`Request #${req.id} advanced to ${nextStatus}.`);
      loadRequests();
    } catch (err) {
      alert(err.message || 'Failed to advance request status.');
    }
  };

  const handleConfirmReceive = () => {
    if (!pendingReceiveAction || isProcessingReceive) return;
    setIsProcessingReceive(true);
    try {
      storageService.updateRequestStatusByCentre(
        pendingReceiveAction.request.id,
        currentCentre.id,
        pendingReceiveAction.nextStatus,
        pendingReceiveAction.auditNote
      );
      triggerBanner(`Request #${pendingReceiveAction.request.id} advanced to ${pendingReceiveAction.nextStatus}.`);
      loadRequests();
      setShowReceiveConfirmModal(false);
      setPendingReceiveAction(null);
    } catch (err) {
      alert(err.message || 'Failed to update request status.');
    } finally {
      setIsProcessingReceive(false);
    }
  };

  const handleOpenReject = () => {
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!activeRequest || !currentCentre) return;
    if (!rejectionReason.trim()) {
      alert('A valid rejection reason is required.');
      return;
    }
    try {
      storageService.rejectRequest(activeRequest.id, currentCentre.id, rejectionReason.trim());
      setShowRejectModal(false);
      setRejectionReason('');
      triggerBanner(`Request #${activeRequest.id} rejected.`);
      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 page-enter text-charcoal dark:text-[#F5F5F5]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#3A3E43]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
              Assigned Intake Requests
            </h1>
            <span className="text-xs font-mono font-bold text-forest dark:text-[#FF7028] bg-forest-50 dark:bg-[#FF7028]/15 px-2 py-0.5 rounded border border-forest-200 dark:border-[#FF7028]/30">
              {currentCentre?.name || 'Authorized Hub'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-1">
            Review customer declarations, reserve appointment capacity, record intake receipt, and manage history visibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-[#B8BDC3]">
            Total Pipeline: <strong>{allRequests.length}</strong> manifests
          </span>
        </div>
      </div>

      {bannerMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{bannerMsg}</span>
        </div>
      )}

      {/* Primary Section Tabs: Active Pipeline vs History vs Hidden Archive */}
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
            <Clock className="w-3.5 h-3.5" />
            <span>Active Pipeline</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                viewTab === 'active' ? 'bg-forest-800 dark:bg-[#F45D16] text-white' : 'bg-gray-200 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3]'
              }`}
            >
              {activePipeline.length}
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
            <span>Facility History</span>
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

        {/* Toolbar Batch Actions */}
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
                  <Trash2 className="w-3.5 h-3.5 text-gray-400 dark:text-[#B8BDC3]" />
                  <span>Clear Facility History</span>
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
                <span>Restore All Facility Records</span>
              </button>
            </>
          )}
        </div>
      </div>

      {allRequests.length > 0 ? (
        <div className="space-y-6">
          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 dark:text-[#B8BDC3] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, customer name, email, item..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-gray-50/50 dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
              />
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-gray-50/50 dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
              >
                <option value="all">All Waste Streams</option>
                <option value="Computers & Laptops">Computers &amp; Laptops</option>
                <option value="Smartphones & Tablets">Smartphones &amp; Tablets</option>
                <option value="Batteries & Power Units">Batteries &amp; Power Units</option>
                <option value="Displays & Monitors">Displays &amp; Monitors</option>
                <option value="Home & Office Appliances">Home &amp; Office Appliances</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-gray-50/50 dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
              >
                <option value="all">All Statuses</option>
                <option value="Submitted">Submitted (Awaiting Review)</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Transit">In Transit</option>
                <option value="Received">Received &amp; Verified</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Master Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Request Cards (5 Cols) */}
            <div className="lg:col-span-5 space-y-3">
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
                      className="rounded text-forest dark:text-[#FF7028] border-gray-300 dark:border-[#3A3E43] dark:bg-[#202326] focus:ring-forest dark:focus:ring-[#FF7028] w-3.5 h-3.5"
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
                        className={`rounded-xl border transition-all ${
                          isSelected
                            ? 'border-forest dark:border-[#FF7028] bg-white dark:bg-[#292D31] ring-2 ring-forest/20 dark:ring-[#FF7028]/20 shadow-xs'
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
                                  className="rounded text-forest dark:text-[#FF7028] border-gray-300 dark:border-[#3A3E43] dark:bg-[#202326] focus:ring-forest dark:focus:ring-[#FF7028] w-3.5 h-3.5"
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
                                    : req.status === 'Reschedule Requested'
                                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                    : req.status === 'Rejected'
                                    ? 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                                    : req.status === 'Cancelled'
                                    ? 'bg-gray-100 dark:bg-[#202326] text-gray-600 dark:text-[#B8BDC3] border-gray-300 dark:border-[#3A3E43]'
                                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                {req.status}
                              </span>

                              {/* Individual Visibility Actions */}
                              {viewTab === 'history' && canHide && (
                                <button
                                  type="button"
                                  onClick={() => handleHideSingle(req)}
                                  title="Hide from facility operational view (preserves audit records)"
                                  className="p-1 rounded text-gray-400 dark:text-[#B8BDC3] hover:text-amber-700 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-[#202326] transition-colors"
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {viewTab === 'archive' && (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreSingle(req.id)}
                                  title="Restore to facility history"
                                  className="p-1 rounded text-gray-400 dark:text-[#B8BDC3] hover:text-forest dark:hover:text-[#FF7028] hover:bg-gray-100 dark:hover:bg-[#202326] transition-colors"
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
                            <h4 className="text-xs font-semibold text-charcoal dark:text-[#F5F5F5] truncate">
                              {req.items}
                            </h4>
                            <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3] mt-1 flex items-center justify-between">
                              <span className="truncate max-w-[170px]">
                                {req.customerName || req.userEmail}
                              </span>
                              <span>~{req.weight || 1} kg</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl space-y-2">
                  <Inbox className="w-8 h-8 text-gray-400 dark:text-[#B8BDC3] mx-auto" />
                  <div className="text-xs font-semibold text-charcoal dark:text-[#F5F5F5]">
                    {viewTab === 'active'
                      ? 'No active intake requests.'
                      : viewTab === 'history'
                      ? 'No facility historical requests.'
                      : 'No hidden records in facility archive.'}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                    {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try resetting search keywords or filters.'
                      : 'New customer requests designated for this centre will appear in Active Pipeline.'}
                  </p>
                </div>
              )}

              {/* Pagination */}
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

            {/* Right Column: Detailed Request Inspection & Operational Actions (7 Cols) */}
            {activeRequest ? (
              <div className="lg:col-span-7 bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-[#3A3E43]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-forest dark:text-[#FF7028]">
                        #{activeRequest.id}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-forest-50 dark:bg-[#FF7028]/15 text-forest dark:text-[#FF7028] border border-forest-200 dark:border-[#FF7028]/30">
                        {activeRequest.status}
                      </span>
                      {hiddenIdsSet.has(activeRequest.id) && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Hidden from Facility History
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] mt-1">
                      {activeRequest.items}
                    </h2>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-[#B8BDC3]">
                    Logged: {activeRequest.date}
                  </span>
                </div>

                {/* Simplified 3-Stage Progress Stepper */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-[#B8BDC3] uppercase tracking-wider block">
                      Intake Progression ({activeRequest.method === 'pickup' ? 'Doorstep Collection Flow' : 'Depot Drop-off Flow'})
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-[#B8BDC3]">
                      Staff Custody Tracking
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { title: 'Submitted', desc: 'Customer declaration logged' },
                      { title: 'Scheduled', desc: 'Appointment slot reserved' },
                      { title: 'Received', desc: 'Physical hardware custody verified' },
                    ].map((st, idx) => {
                      const stepIdx = getStepIndex(activeRequest.status);
                      const isPassed = stepIdx >= 0 && idx <= stepIdx;
                      const isCurrent = stepIdx >= 0 && idx === stepIdx;
                      return (
                        <div
                          key={st.title}
                          className={`p-2.5 rounded-lg border text-center transition-colors ${
                            isCurrent
                              ? 'bg-forest-50 dark:bg-[#FF7028]/15 border-forest dark:border-[#FF7028] text-forest dark:text-[#FF7028] font-semibold ring-1 ring-forest/30 dark:ring-[#FF7028]/30'
                              : isPassed
                              ? 'bg-sage-100/50 dark:bg-[#202326] border-forest-200 dark:border-[#3A3E43] text-charcoal dark:text-[#F5F5F5]'
                              : 'bg-white dark:bg-[#202326] border-gray-200 dark:border-[#3A3E43] text-gray-400 dark:text-[#B8BDC3]/50'
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

                {/* Action Toolbar for Staff */}
                <div className="bg-sage-100/60 dark:bg-[#202326] p-4 rounded-xl border border-sage-200 dark:border-[#3A3E43] space-y-3">
                  <div className="text-xs font-bold text-charcoal dark:text-[#F5F5F5] uppercase tracking-wider flex items-center justify-between">
                    <span>Operational Staff Actions</span>
                    <span className="text-[10px] text-gray-500 dark:text-[#B8BDC3] font-normal">State updates sync with customer</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Accept Action - Opens Appointment Calendar */}
                    {activeRequest.status === 'Submitted' && (
                      <button
                        type="button"
                        onClick={handleOpenBookModal}
                        className="btn-primary text-xs px-3.5 py-2 font-semibold shadow-xs flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Accept &amp; Schedule Intake</span>
                      </button>
                    )}

                    {/* Reschedule Button */}
                    {['Scheduled', 'Accepted', 'Schedule Proposed', 'Reschedule Requested'].includes(activeRequest.status) && (
                      <button
                        type="button"
                        onClick={handleOpenRescheduleModal}
                        className="bg-white dark:bg-[#292D31] hover:bg-gray-50 dark:hover:bg-[#202326] text-gray-700 dark:text-[#F5F5F5] border border-gray-300 dark:border-[#3A3E43] text-xs px-3.5 py-2 rounded-md font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Calendar className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                        <span>Reschedule Appointment</span>
                      </button>
                    )}

                    {/* Advance from Scheduled */}
                    {['Scheduled', 'Confirmed', 'Schedule Proposed'].includes(activeRequest.status) && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAdvanceStatus(
                            activeRequest.method === 'pickup' ? 'In Transit' : 'Received',
                            activeRequest.method === 'pickup'
                              ? 'Courier van dispatched for doorstep pickup'
                              : 'Hardware delivered by customer at depot intake kiosk; inspection complete and received'
                          )
                        }
                        className="btn-primary text-xs px-3.5 py-2 font-semibold flex items-center gap-1.5 shadow-xs"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>
                          {activeRequest.method === 'pickup'
                            ? 'Dispatch Courier Pickup'
                            : 'Mark Hardware Received at Kiosk'}
                        </span>
                      </button>
                    )}

                    {/* In Transit -> Received */}
                    {activeRequest.status === 'In Transit' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAdvanceStatus(
                            'Received',
                            'Courier returned to facility with hardware; physical custody received and verified'
                          )
                        }
                        className="btn-secondary text-xs px-3.5 py-2 font-semibold flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
                        <span>Mark Hardware Received at Facility</span>
                      </button>
                    )}

                    {/* Physical Custody Verified */}
                    {['Received', 'Drop-off Completed', 'Processing', 'Completed', 'Recycled'].includes(activeRequest.status) && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-md">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Physical custody received and verified at facility.</span>
                      </div>
                    )}

                    {/* Reject Request */}
                    {!['Received', 'Drop-off Completed', 'Processing', 'Completed', 'Recycled', 'Rejected', 'Cancelled'].includes(activeRequest.status) && (
                      <button
                        type="button"
                        onClick={handleOpenReject}
                        className="px-3.5 py-2 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md transition-colors flex items-center gap-1.5 ml-auto"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject Declaration</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Rejection notice if rejected */}
                {activeRequest.status === 'Rejected' && activeRequest.rejectionReason && (
                  <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-300 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span>Declaration Rejected</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Reason recorded: <em>"{activeRequest.rejectionReason}"</em>
                    </p>
                  </div>
                )}

                {/* Customer Reschedule Request Notice */}
                {activeRequest.status === 'Reschedule Requested' && (
                  <div className="p-3.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 text-purple-900 dark:text-purple-200 text-xs space-y-1.5 shadow-2xs">
                    <div className="font-bold flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                      <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>Customer Requested Rescheduling</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      The customer requested an alternative appointment slot. Use <strong>Reschedule Appointment</strong> in the actions toolbar to allocate a new date and time.
                    </p>
                    {activeRequest.appointment?.customerNote && (
                      <div className="bg-white/90 dark:bg-[#202326] p-2 rounded border border-purple-200 dark:border-purple-800 text-[11px]">
                        <span className="font-semibold text-purple-950 dark:text-purple-300">Customer Note:</span>{' '}
                        <span className="italic text-charcoal dark:text-[#B8BDC3]">"{activeRequest.appointment.customerNote}"</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Appointment Details Card */}
                {activeRequest.appointment && (
                  <div className="p-4 rounded-xl border border-[#FFE6D5] dark:border-[#3A3E43] bg-[#FFF3EB] dark:bg-[#202326] text-xs space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-[#FFE6D5] dark:border-[#3A3E43] font-bold text-charcoal dark:text-[#F5F5F5]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#F45D16] dark:text-[#FF7028]" />
                        <span>Reserved Intake Appointment</span>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white dark:bg-[#292D31] border border-[#FFE6D5] dark:border-[#3A3E43] text-[#F45D16] dark:text-[#FF7028]">
                        Ref: {activeRequest.appointment.bookingRef || 'LOCKED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
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

                {/* Hardware & Customer Specifications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-gray-100 dark:border-[#3A3E43]">
                  <div>
                    <span className="text-gray-500 dark:text-[#B8BDC3] block mb-0.5">Customer Contact</span>
                    <span className="font-semibold text-charcoal dark:text-[#F5F5F5] block">
                      {activeRequest.customerName || 'Customer'}
                    </span>
                    <span className="text-gray-500 dark:text-[#B8BDC3] font-mono text-[11px] block">
                      {activeRequest.userEmail}
                    </span>
                    {activeRequest.customerPhone && (
                      <span className="text-gray-500 dark:text-[#B8BDC3] text-[11px] block">
                        Tel: {activeRequest.customerPhone}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-gray-500 dark:text-[#B8BDC3] block mb-0.5">Service Channel &amp; Intake</span>
                    <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">{activeRequest.channel}</span>
                    <span className="text-gray-500 dark:text-[#B8BDC3] block mt-0.5">
                      Intake Point: {activeRequest.intakePoint || 'Main Loading Dock'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 dark:text-[#B8BDC3] block mb-0.5">Quantity &amp; Weight</span>
                    <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">
                      {activeRequest.quantity} unit(s) • ~{activeRequest.weight} kg
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 dark:text-[#B8BDC3] block mb-0.5">Location / Address</span>
                    <span className="font-semibold text-charcoal dark:text-[#F5F5F5] truncate block">
                      {storageService.getRequestDisplayAddress(activeRequest)}
                    </span>
                  </div>

                  {activeRequest.notes && (
                    <div className="sm:col-span-2 pt-2 border-t border-gray-100 dark:border-[#3A3E43]">
                      <span className="text-gray-500 dark:text-[#B8BDC3] block mb-0.5">Customer Notes</span>
                      <span className="text-charcoal dark:text-[#F5F5F5] italic">{activeRequest.notes}</span>
                    </div>
                  )}
                </div>

                {/* Audit History Log */}
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-[#3A3E43]">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-[#B8BDC3] uppercase tracking-wider">
                    Authoritative Chain-of-Custody Log
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
        <div className="p-16 text-center bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-2xl space-y-3 shadow-xs">
          <Inbox className="w-10 h-10 text-gray-400 dark:text-[#B8BDC3] mx-auto" />
          <h2 className="text-lg font-bold text-charcoal dark:text-[#F5F5F5]">
            No Manifests Assigned to this Centre
          </h2>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] max-w-sm mx-auto">
            When customers register e-waste and choose <strong>{currentCentre?.name}</strong>, their requests will appear here for review and scheduling.
          </p>
        </div>
      )}

      {/* ── MODAL: Clear Facility History Confirmation Dialog ── */}
      {showClearHistoryModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200 dark:border-[#3A3E43] animate-fadeIn">
            <div className="flex items-center gap-2 text-charcoal dark:text-[#F5F5F5]">
              <Archive className="w-5 h-5 text-forest dark:text-[#FF7028]" />
              <h3 className="text-base font-bold">Clear Facility History View</h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              You are about to hide <strong>{visibleHistory.length} completed historical records</strong> from this facility's operational history list.
            </p>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Auditing &amp; Public Statistics Unaffected</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Hiding history is an interface view preference for <strong>{currentCentre?.name}</strong>. It does not delete original transaction records, alter custody audit history, release past capacity, or modify public environmental statistics.
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

      {/* ── MODAL: Batch Hide Facility History Confirmation Dialog ── */}
      {showBatchHideModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200 dark:border-[#3A3E43] animate-fadeIn">
            <div className="flex items-center gap-2 text-charcoal dark:text-[#F5F5F5]">
              <EyeOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-base font-bold">Hide Selected Records</h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              You are about to hide <strong>{selectedBatchIds.size} completed historical record(s)</strong> from this facility's active history view.
            </p>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Original Records &amp; Public Statistics Preserved</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Hiding is a facility view preference. Master transaction manifests, customer declarations, and public cumulative statistics remain permanently preserved. Hidden records can be restored from the Hidden Archive tab at any time.
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
              <h3 className="text-base font-bold">Hide Record from Facility View</h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              Are you sure you want to hide request <strong>#{recordToHide.id}</strong>{recordToHide.brand ? ` (${recordToHide.brand} ${recordToHide.model})` : ''} from this facility's operational history list?
            </p>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Audit Records &amp; Environmental Impact Preserved</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Hiding changes your facility's visible history only. Original transaction records and cumulative environmental impact statistics remain completely unaffected. Hidden records remain preserved in your facility's permanent archive and can be restored at any time.
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

      {/* ── MODAL: Consequential Physical Receipt Confirmation Dialog ── */}
      {showReceiveConfirmModal && pendingReceiveAction && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200 dark:border-[#3A3E43] animate-fadeIn">
            <div className="flex items-center gap-2 text-charcoal dark:text-[#F5F5F5]">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold">Confirm Physical Hardware Receipt</h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              Are you sure you want to advance request <strong>#{pendingReceiveAction.request.id}</strong> ({pendingReceiveAction.request.brand} {pendingReceiveAction.request.model}, {pendingReceiveAction.request.weight} kg) to <strong>Received</strong>?
            </p>

            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Chain of Custody &amp; Environmental Impact Aggregation</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Recording physical receipt updates the operational chain-of-custody records and aggregates environmental impact metrics (landfill diversion, CO₂ savings, and material recovery) on the public platform.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#3A3E43]">
              <button
                type="button"
                onClick={() => {
                  setShowReceiveConfirmModal(false);
                  setPendingReceiveAction(null);
                }}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingReceive}
                onClick={handleConfirmReceive}
                className="btn-primary text-xs px-4 py-2 font-semibold disabled:opacity-50"
              >
                {isProcessingReceive ? 'Confirming Receipt...' : 'Confirm Physical Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Reject Request Dialog ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-200 dark:border-[#3A3E43] animate-fadeIn">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">Reject Declaration</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-[#B8BDC3]">
              Please specify the reason why <strong>{currentCentre?.name}</strong> cannot accept this declaration.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Hazardous chemical damage, incompatible equipment type, or missing documentation."
                  className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Appointment Scheduling Calendar ── */}
      {showCalendarModal && activeRequest && currentCentre && (
        <AppointmentCalendarModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          request={activeRequest}
          centre={currentCentre}
          mode={calendarMode}
          onSuccess={handleCalendarSuccess}
        />
      )}
    </div>
  );
}
