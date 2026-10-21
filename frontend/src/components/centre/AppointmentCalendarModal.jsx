import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Truck,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Info,
  Scale,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { storageService, STANDARD_SLOTS } from '../../services/storageService';

export default function AppointmentCalendarModal({
  isOpen,
  onClose,
  request,
  centre,
  onSuccess,
  mode = 'book', // 'book' or 'reschedule'
}) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [instructions, setInstructions] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch full 21-day calculated availability
  const availabilityData = useMemo(() => {
    if (!isOpen || !centre?.id || !request) return null;
    return storageService.getCentreAvailability(centre.id, request, 21);
  }, [isOpen, centre?.id, request?.id, request?.weight, request?.quantity, request?.method]);

  // Initialize or reset form state when modal opens
  useEffect(() => {
    if (!isOpen || !request) return;

    setErrorMessage('');
    setIsSubmitting(false);

    if (mode === 'reschedule' && request.appointment) {
      setSelectedDate(request.appointment.date || '');
      setSelectedSlot(request.appointment.timeSlot || request.appointment.timeWindow || '');
      setInstructions(request.appointment.instructions || '');
      setPickupAddress(
        request.appointment.pickupAddress || request.address || ''
      );
    } else {
      // Find the earliest available date
      const firstAvailDay = availabilityData?.availableDays?.find((d) => d.isAvailable);
      if (firstAvailDay) {
        setSelectedDate(firstAvailDay.date);
        const firstAvailSlot = firstAvailDay.slots.find((s) => s.available);
        setSelectedSlot(firstAvailSlot ? firstAvailSlot.timeSlot : '');
      } else {
        setSelectedDate('');
        setSelectedSlot('');
      }

      // Default instructions
      if (request.method === 'pickup') {
        setInstructions(
          'Our authorized courier van will contact you 15 minutes prior to collection. Please ensure devices are disconnected and ready.'
        );
      } else {
        setInstructions(
          `Please bring your equipment to ${centre?.name || 'facility'} intake inspection kiosk during your reserved time slot.`
        );
      }

      setPickupAddress(request.address || '');
    }
  }, [isOpen, request?.id, mode, availabilityData]);

  if (!isOpen || !request || !centre) return null;

  const days = availabilityData?.availableDays || [];
  const selectedDay = days.find((d) => d.date === selectedDate);

  const handleSelectDate = (day) => {
    if (!day.isAvailable) return;
    setSelectedDate(day.date);
    setErrorMessage('');
    // If the currently selected slot is not available on the new date, pick first available slot
    const currentSlotAvailable = day.slots.find(
      (s) => s.timeSlot === selectedSlot && s.available
    );
    if (!currentSlotAvailable) {
      const firstValid = day.slots.find((s) => s.available);
      setSelectedSlot(firstValid ? firstValid.timeSlot : '');
    }
  };

  const handleSelectSlot = (slot) => {
    if (!slot.available) return;
    setSelectedSlot(slot.timeSlot);
    setErrorMessage('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDate) {
      setErrorMessage('Please select an available appointment date.');
      return;
    }
    if (!selectedSlot) {
      setErrorMessage('Please select an available intake time slot.');
      return;
    }
    if (request.method === 'pickup' && !pickupAddress.trim()) {
      setErrorMessage('Pickup street address is required for doorstep courier collection.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let updated;
      if (mode === 'reschedule') {
        updated = storageService.rescheduleAppointment(request.id, centre.id, {
          date: selectedDate,
          timeSlot: selectedSlot,
          instructions: instructions.trim(),
          pickupAddress: pickupAddress.trim(),
          staffName: centre.name,
        });
      } else {
        updated = storageService.bookAppointment(request.id, centre.id, {
          date: selectedDate,
          timeSlot: selectedSlot,
          instructions: instructions.trim(),
          pickupAddress: pickupAddress.trim(),
          staffName: centre.name,
        });
      }

      setIsSubmitting(false);
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to reserve appointment slot. Please try another slot.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 dark:bg-black/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#292D31] rounded-2xl max-w-3xl w-full border border-gray-200 dark:border-[#3A3E43] shadow-2xl overflow-hidden my-8 animate-fadeIn text-charcoal dark:text-[#F5F5F5]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-offwhite dark:bg-[#202326] border-b border-gray-200 dark:border-[#3A3E43] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] border border-forest-200 dark:border-[#3A3E43]">
                #{request.id}
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-[#B8BDC3] capitalize">
                {request.method === 'pickup' ? 'Doorstep Courier Collection' : 'Depot Kiosk Drop-off'}
              </span>
            </div>
            <h2 id="calendar-modal-title" className="text-lg font-bold text-charcoal dark:text-[#F5F5F5] mt-1">
              {mode === 'reschedule' ? 'Reschedule Appointment' : 'Accept Request & Reserve Appointment'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">
              Review verified facility processing capacity and lock in an authorized time slot.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] hover:bg-gray-100 dark:hover:bg-[#202326] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Request Specification Banner */}
        <div className="px-6 py-3 bg-sage-100/50 dark:bg-[#202326] border-b border-sage-200 dark:border-[#3A3E43] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <Package className="w-4 h-4 text-forest dark:text-[#FF7028] shrink-0" />
            <div>
              <span className="font-bold text-charcoal dark:text-[#F5F5F5]">{request.items}</span>
              <span className="text-gray-500 dark:text-[#B8BDC3] ml-2">
                ({request.quantity} unit{request.quantity > 1 ? 's' : ''} • ~{request.weight} kg)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-gray-600 dark:text-[#B8BDC3]">
            <div>
              <span className="text-gray-400 dark:text-gray-500">Customer:</span>{' '}
              <strong className="text-charcoal dark:text-[#F5F5F5]">{request.customerName || request.userEmail}</strong>
            </div>
            {request.customerPhone && (
              <div>
                <span className="text-gray-400 dark:text-gray-500">Phone:</span>{' '}
                <strong className="text-charcoal dark:text-[#F5F5F5]">{request.customerPhone}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Modal Body / Calendar & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Appointment Date Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5] flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                <span>1. Select Scheduled Date *</span>
              </label>
              <span className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                Operating days: <strong className="text-charcoal dark:text-[#F5F5F5]">{centre.operatingDays || 'Monday to Friday'}</strong>
              </span>
            </div>

            {/* Calendar Grid (21 Days) */}
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
              {days.map((day) => {
                const isSelected = day.date === selectedDate;
                const isAvail = day.isAvailable;

                let stateClasses = '';
                if (isSelected) {
                  // Distinct selected active style
                  stateClasses =
                    'bg-forest text-white border-forest dark:bg-[#FF7028] dark:border-[#FF7028] shadow-xs ring-2 ring-forest/30 dark:ring-[#FF7028]/30 font-bold';
                } else if (isAvail) {
                  // Subtle green-tinted background, NOT solid green fill
                  stateClasses =
                    'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-200 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer';
                } else {
                  // Subtle red-tinted background and disabled selection
                  stateClasses =
                    'bg-red-50/40 dark:bg-red-950/20 border-red-100 dark:border-red-900/40 text-gray-400 dark:text-gray-500 cursor-not-allowed hover:bg-red-50/60 dark:hover:bg-red-950/30';
                }

                return (
                  <button
                    key={day.date}
                    type="button"
                    disabled={!isAvail}
                    onClick={() => handleSelectDate(day)}
                    title={
                      isAvail
                        ? `Available: ${day.remainingDayKg} kg capacity remaining`
                        : `Unavailable: ${day.reason}`
                    }
                    className={`relative p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between min-h-[72px] ${stateClasses}`}
                  >
                    {/* Today indicator (separate indicator, does not imply availability) */}
                    {day.isToday && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-extrabold uppercase tracking-wider absolute top-1 right-1 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
                        }`}
                      >
                        Today
                      </span>
                    )}

                    <span
                      className={`text-[10px] uppercase font-semibold block ${
                        isSelected
                          ? 'text-white/80'
                          : isAvail
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {day.dayName}
                    </span>

                    <span className="text-base font-bold my-0.5 leading-none">
                      {day.dayNumber}
                    </span>

                    <span
                      className={`text-[9px] truncate max-w-full block ${
                        isSelected
                          ? 'text-white/80'
                          : isAvail
                          ? 'text-emerald-800 dark:text-emerald-300 font-medium'
                          : 'text-red-400/90 dark:text-red-400/70'
                      }`}
                    >
                      {isSelected
                        ? 'Selected'
                        : isAvail
                        ? `${day.remainingDayKg} kg left`
                        : day.isOpenDay
                        ? day.isPastOrLeadTime
                          ? 'Lead time'
                          : 'Full'
                        : 'Closed'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Accessible Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-1 pb-1 text-[11px] text-gray-600 dark:text-[#B8BDC3] border-t border-gray-100 dark:border-[#3A3E43]">
              <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">Legend:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/60 inline-block" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-red-100 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/30 inline-block" />
                <span>Unavailable / Closed / Full</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-forest bg-forest dark:border-[#FF7028] dark:bg-[#FF7028] inline-block" />
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                  Today
                </span>
                <span>Current Date</span>
              </div>
            </div>
          </div>

          {/* Section 2: Time Slot Selection */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-[#3A3E43]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                <span>2. Select Operating Time Slot *</span>
              </label>
              {selectedDay && (
                <span className="text-xs font-medium text-forest dark:text-[#FF7028]">
                  {selectedDay.dayName}, {selectedDay.monthName} {selectedDay.dayNumber} (
                  {selectedDay.remainingDayKg} kg day limit remaining)
                </span>
              )}
            </div>

            {selectedDay ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedDay.slots.map((slot) => {
                  const isSlotSelected = slot.timeSlot === selectedSlot;
                  const isSlotAvail = slot.available;

                  let slotClasses = '';
                  if (isSlotSelected) {
                    slotClasses =
                      'border-forest dark:border-[#FF7028] bg-forest-50/60 dark:bg-[#FF7028]/15 ring-2 ring-forest/30 dark:ring-[#FF7028]/30 text-forest dark:text-[#FF7028] font-bold';
                  } else if (isSlotAvail) {
                    slotClasses =
                      'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#202326] hover:border-forest/70 dark:hover:border-[#FF7028]/70 hover:bg-forest-50/50 dark:hover:bg-[#292D31] text-charcoal dark:text-[#F5F5F5] cursor-pointer';
                  } else {
                    slotClasses =
                      'border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 text-gray-400 dark:text-gray-500 cursor-not-allowed';
                  }

                  return (
                    <button
                      key={slot.timeSlot}
                      type="button"
                      disabled={!isSlotAvail}
                      onClick={() => handleSelectSlot(slot)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${slotClasses}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className={`w-3.5 h-3.5 ${isSlotAvail ? 'text-forest dark:text-[#FF7028]' : 'text-gray-300 dark:text-gray-600'}`} />
                          <span className={`text-xs ${isSlotAvail ? 'font-semibold' : 'line-through text-gray-400 dark:text-gray-500'}`}>
                            {slot.timeSlot}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-[#B8BDC3] mt-1 pl-5.5">
                          {isSlotAvail ? (
                            <span>
                              Available: <strong className="text-charcoal dark:text-[#F5F5F5]">{slot.remainingSlotKg} kg</strong> • <strong className="text-charcoal dark:text-[#F5F5F5]">{slot.remainingSlotUnits} units</strong>
                            </span>
                          ) : (
                            <span className="text-red-500 dark:text-red-400 font-medium">
                              {slot.reason || 'Slot Full'}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSlotSelected && (
                        <CheckCircle2 className="w-4 h-4 text-forest dark:text-[#FF7028] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] text-xs text-gray-500 dark:text-[#B8BDC3] text-center">
                Select an available date above to review its operating time slots.
              </div>
            )}
          </div>

          {/* Section 3: Fulfillment & Intake Instructions */}
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-[#3A3E43]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5]">
              3. Logistics &amp; Facility Directives
            </h3>

            {request.method === 'pickup' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-[#B8BDC3] mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
                  <span>Doorstep Courier Collection Address *</span>
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Building, street address, city, floor or dispatch bay"
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-[#3A3E43] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF7028] bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-[#B8BDC3] mb-1">
                Intake Instructions for Customer (Appears on Customer Dashboard)
              </label>
              <textarea
                rows="2"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Specific guidance regarding device preparation, battery packaging, or entrance kiosk."
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-[#3A3E43] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF7028] bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="pt-4 border-t border-gray-200 dark:border-[#3A3E43] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] hover:bg-gray-100 dark:hover:bg-[#202326] rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!selectedDate || !selectedSlot || isSubmitting}
              className={`btn-primary text-xs px-5 py-2.5 font-semibold shadow-sm flex items-center gap-2 ${
                !selectedDate || !selectedSlot || isSubmitting
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Reserving Slot...'
                  : mode === 'reschedule'
                  ? 'Confirm Rescheduled Slot'
                  : 'Confirm & Reserve Appointment'}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
