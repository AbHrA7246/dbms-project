import React, { useMemo } from 'react';
import {
  Calendar,
  Clock,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  WEEKDAY_CODES,
  WEEKDAY_FULL_NAMES,
  formatOperatingDays,
  parseOperatingDays,
  time24To12,
  time12To24,
  formatOperatingHours,
  parseOperatingHours,
  validateSchedule,
} from '../../services/storageService';

/**
 * SVG Mini Analog Clock Face to visually render selected 12-hour time.
 */
function MiniClockFace({ hour12 = 9, minute = '00', ampm = 'AM' }) {
  const mNum = parseInt(minute, 10) || 0;
  const hNum = parseInt(hour12, 10) || 12;

  // Angles: minute hand rotates 360 deg in 60 mins; hour hand rotates 30 deg per hour + 0.5 deg per min
  const minuteAngle = (mNum / 60) * 360;
  const hourAngle = ((hNum % 12) + mNum / 60) * 30;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-sm select-none"
        aria-hidden="true"
      >
        {/* Outer dial */}
        <circle
          cx="50"
          cy="50"
          r="46"
          className="fill-white dark:fill-[#202326] stroke-gray-300 dark:stroke-[#3A3E43]"
          strokeWidth="3"
        />
        {/* Subtle inner accent ring */}
        <circle
          cx="50"
          cy="50"
          r="41"
          className="fill-none stroke-gray-100 dark:stroke-[#3A3E43]/40"
          strokeWidth="1"
        />
        {/* Hour tick marks */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
          <line
            key={deg}
            x1="50"
            y1="8"
            x2="50"
            y2={deg % 90 === 0 ? '14' : '11'}
            className={
              deg % 90 === 0
                ? 'stroke-gray-700 dark:stroke-[#F5F5F5] stroke-[2]'
                : 'stroke-gray-300 dark:stroke-[#3A3E43] stroke-[1]'
            }
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
        {/* Hour hand */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="26"
          className="stroke-forest dark:stroke-[#FF7028] stroke-[3.5] stroke-linecap-round"
          transform={`rotate(${hourAngle} 50 50)`}
        />
        {/* Minute hand */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="16"
          className="stroke-charcoal dark:stroke-[#F5F5F5] stroke-[2] stroke-linecap-round"
          transform={`rotate(${minuteAngle} 50 50)`}
        />
        {/* Center pivot point */}
        <circle cx="50" cy="50" r="4" className="fill-forest dark:fill-[#FF7028]" />
        <circle cx="50" cy="50" r="1.5" className="fill-white dark:fill-[#0A0A0A]" />
      </svg>
      <span className="text-[10px] font-semibold text-gray-500 dark:text-[#B8BDC3] mt-1 uppercase tracking-wider">
        {ampm}
      </span>
    </div>
  );
}

/**
 * Decomposes a 24-hour time string ("09:00", "17:30") into 12-hour components.
 */
function decompose24(time24 = '09:00') {
  if (!time24 || typeof time24 !== 'string') {
    return { hour: 9, minute: '00', ampm: 'AM' };
  }
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 9;
  let m = parseInt(mStr || '0', 10);
  if (isNaN(m)) m = 0;
  // Snap minute to nearest 15-minute interval
  const snappedM = (Math.round(m / 15) * 15) % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return {
    hour: h12,
    minute: String(snappedM).padStart(2, '0'),
    ampm,
  };
}

/**
 * Composes 12-hour components back into a normalized 24-hour time string ("HH:mm").
 */
function compose24(hour12, minuteStr, ampm) {
  let h = parseInt(hour12, 10);
  if (isNaN(h)) h = 9;
  const m = parseInt(minuteStr, 10) || 0;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Computes operating duration between two 24h strings.
 */
function calculateOperatingDuration(open24, close24) {
  if (!open24 || !close24) return null;
  const [oh, om] = open24.split(':').map(Number);
  const [ch, cm] = close24.split(':').map(Number);
  const diffMinutes = ch * 60 + cm - (oh * 60 + om);
  if (diffMinutes <= 0) return null;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (minutes === 0) return `${hours} hrs`;
  return `${hours} hrs ${minutes} mins`;
}

/**
 * Individual Visual Time Picker Card for Opening or Closing time.
 */
function VisualTimeCard({
  label,
  icon: Icon,
  time24,
  onChangeTime,
  disabled = false,
  badgeText = '',
}) {
  const { hour, minute, ampm } = useMemo(() => decompose24(time24), [time24]);

  const handleHourChange = (newHour) => {
    if (disabled) return;
    const next24 = compose24(newHour, minute, ampm);
    onChangeTime(next24);
  };

  const handleMinuteChange = (newMinute) => {
    if (disabled) return;
    const next24 = compose24(hour, newMinute, ampm);
    onChangeTime(next24);
  };

  const handleAmpmChange = (newAmpm) => {
    if (disabled) return;
    const next24 = compose24(hour, minute, newAmpm);
    onChangeTime(next24);
  };

  const formatted12 = time24To12(time24);

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#202326] space-y-4 shadow-sm transition-all hover:border-forest-200 dark:hover:border-[#FF7028]/40">
      {/* Card Header & Display */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#3A3E43] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-forest-50 dark:bg-[#FF7028]/15 text-forest dark:text-[#FF7028] border border-forest-100 dark:border-[#FF7028]/30">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-charcoal dark:text-[#F5F5F5] uppercase tracking-wider">
              {label}
            </span>
            {badgeText && (
              <span className="text-[10px] text-gray-500 dark:text-[#B8BDC3]">
                {badgeText}
              </span>
            )}
          </div>
        </div>

        {/* Digital Readout */}
        <div className="text-right">
          <div className="inline-flex items-baseline gap-1 px-3 py-1 rounded-md bg-forest-50/70 dark:bg-[#292D31] border border-forest-200 dark:border-[#3A3E43] text-forest-800 dark:text-[#FF7028] font-mono font-bold text-sm sm:text-base">
            <span>{formatted12}</span>
          </div>
          <span className="block text-[10px] text-gray-400 dark:text-[#B8BDC3] font-mono mt-0.5">
            ({time24} 24h)
          </span>
        </div>
      </div>

      {/* Visual Clock + Selectors Grid */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Analog Dial */}
        <div className="flex-shrink-0 flex items-center justify-center py-1">
          <MiniClockFace hour12={hour} minute={minute} ampm={ampm} />
        </div>

        {/* Controls Container */}
        <div className="flex-1 w-full space-y-3">
          {/* AM / PM Toggle */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-gray-500 dark:text-[#B8BDC3]">
              Period
            </span>
            <div
              className="inline-flex rounded-lg p-0.5 bg-gray-100 dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43]"
              role="radiogroup"
              aria-label={`${label} AM/PM selector`}
            >
              {['AM', 'PM'].map((period) => {
                const isActive = ampm === period;
                return (
                  <button
                    key={period}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleAmpmChange(period)}
                    aria-checked={isActive}
                    role="radio"
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] ${
                      isActive
                        ? 'bg-forest dark:bg-[#FF7028] dark:hover:bg-[#F45D16] text-white shadow-sm'
                        : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    {period}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hour Selector (1 - 12) */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-[#B8BDC3] mb-1.5">
              <span>Hour</span>
              <span className="font-mono text-charcoal dark:text-[#F5F5F5] font-semibold">
                {hour}
              </span>
            </div>
            <div
              className="grid grid-cols-6 sm:grid-cols-6 gap-1"
              role="group"
              aria-label={`${label} hour selector`}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hVal) => {
                const isSelected = hour === hVal;
                return (
                  <button
                    key={hVal}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleHourChange(hVal)}
                    aria-pressed={isSelected}
                    aria-label={`Set hour to ${hVal}`}
                    className={`py-1 text-xs font-semibold rounded-md border text-center transition-all focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] ${
                      isSelected
                        ? 'bg-forest dark:bg-[#FF7028] dark:hover:bg-[#F45D16] border-forest dark:border-[#FF7028] text-white shadow-sm ring-1 ring-forest/30 dark:ring-[#FF7028]/30'
                        : 'bg-white dark:bg-[#292D31] border-gray-200 dark:border-[#3A3E43] text-gray-700 dark:text-[#B8BDC3] hover:bg-forest-50/50 dark:hover:bg-[#202326] dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    {hVal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minute Selector (15-min increments: 00, 15, 30, 45) */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-[#B8BDC3] mb-1.5">
              <span>Minute (15-min intervals)</span>
              <span className="font-mono text-charcoal dark:text-[#F5F5F5] font-semibold">
                :{minute}
              </span>
            </div>
            <div
              className="grid grid-cols-4 gap-1.5"
              role="group"
              aria-label={`${label} minute selector`}
            >
              {['00', '15', '30', '45'].map((mVal) => {
                const isSelected = minute === mVal;
                return (
                  <button
                    key={mVal}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleMinuteChange(mVal)}
                    aria-pressed={isSelected}
                    aria-label={`Set minute to :${mVal}`}
                    className={`py-1 text-xs font-semibold rounded-md border text-center font-mono transition-all focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] ${
                      isSelected
                        ? 'bg-forest dark:bg-[#FF7028] dark:hover:bg-[#F45D16] border-forest dark:border-[#FF7028] text-white shadow-sm ring-1 ring-forest/30 dark:ring-[#FF7028]/30'
                        : 'bg-white dark:bg-[#292D31] border-gray-200 dark:border-[#3A3E43] text-gray-700 dark:text-[#B8BDC3] hover:bg-forest-50/50 dark:hover:bg-[#202326] dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    :{mVal}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * VisualSchedulePicker
 *
 * Replaces the free-text schedule inputs with an intuitive, theme-aware visual picker for:
 * 1. Operating Days (7 multi-select weekday buttons + shortcuts: Weekdays, Weekends, Every day, Clear)
 * 2. Operating Hours (Opening & Closing time pickers with 15-minute intervals, AM/PM toggle, SVG clock visualization, and schedule presets)
 *
 * @param {Object} props
 * @param {string[]} [props.operatingDaysList] - Array of weekday abbreviations (e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
 * @param {string} [props.openingTime] - 24h string ("09:00")
 * @param {string} [props.closingTime] - 24h string ("17:00")
 * @param {Function} props.onChange - Emits { operatingDaysList, openingTime, closingTime, operatingDays, hours, isValid, error }
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 */
export default function VisualSchedulePicker({
  operatingDaysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  openingTime = '09:00',
  closingTime = '17:00',
  onChange,
  disabled = false,
  className = '',
}) {
  // Normalize days list
  const currentDays = useMemo(() => {
    return Array.isArray(operatingDaysList) && operatingDaysList.length > 0
      ? WEEKDAY_CODES.filter((d) => operatingDaysList.includes(d))
      : [];
  }, [operatingDaysList]);

  // Validation
  const validation = useMemo(() => {
    return validateSchedule({
      operatingDaysList: currentDays,
      openingTime,
      closingTime,
    });
  }, [currentDays, openingTime, closingTime]);

  // Emit changes to parent
  const emitChanges = (newDays, newOpen, newClose) => {
    if (!onChange) return;
    const days = newDays !== undefined ? newDays : currentDays;
    const open = newOpen !== undefined ? newOpen : openingTime;
    const close = newClose !== undefined ? newClose : closingTime;

    const val = validateSchedule({
      operatingDaysList: days,
      openingTime: open,
      closingTime: close,
    });

    onChange({
      operatingDaysList: days,
      openingTime: open,
      closingTime: close,
      operatingDays: formatOperatingDays(days),
      hours: formatOperatingHours(open, close),
      isValid: val.isValid,
      error: val.error,
    });
  };

  // Operating Days Handlers
  const handleToggleDay = (dayCode) => {
    if (disabled) return;
    let nextDays;
    if (currentDays.includes(dayCode)) {
      nextDays = currentDays.filter((d) => d !== dayCode);
    } else {
      nextDays = WEEKDAY_CODES.filter((d) => currentDays.includes(d) || d === dayCode);
    }
    emitChanges(nextDays, undefined, undefined);
  };

  const handleApplyPresetDays = (daysArray) => {
    if (disabled) return;
    emitChanges(daysArray, undefined, undefined);
  };

  // Time Handlers
  const handleOpenTimeChange = (newOpen24) => {
    if (disabled) return;
    emitChanges(undefined, newOpen24, undefined);
  };

  const handleCloseTimeChange = (newClose24) => {
    if (disabled) return;
    emitChanges(undefined, undefined, newClose24);
  };

  const handleApplyHoursPreset = (presetOpen, presetClose) => {
    if (disabled) return;
    emitChanges(undefined, presetOpen, presetClose);
  };

  // Human summaries
  const operatingDaysSummary = formatOperatingDays(currentDays);
  const durationPerDay = calculateOperatingDuration(openingTime, closingTime);
  const totalWeeklyHours = useMemo(() => {
    if (!durationPerDay || currentDays.length === 0) return null;
    const [oh, om] = openingTime.split(':').map(Number);
    const [ch, cm] = closingTime.split(':').map(Number);
    const dailyMins = ch * 60 + cm - (oh * 60 + om);
    if (dailyMins <= 0) return null;
    const totalMins = dailyMins * currentDays.length;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (mins === 0) return `${hours} hrs`;
    return `${hours}h ${mins}m`;
  }, [openingTime, closingTime, currentDays.length, durationPerDay]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ────────────────────────────────────────────── */}
      {/* 1. Operating Days Section */}
      {/* ────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 dark:border-[#3A3E43] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] border border-forest-100 dark:border-[#3A3E43]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">
                Operating Days
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                Select days of the week when this facility receives e-waste drop-offs and dispatches pickups.
              </p>
            </div>
          </div>

          {/* Active Days Summary Pill */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                currentDays.length > 0
                  ? 'bg-forest-50 dark:bg-[#FF7028]/15 text-forest dark:text-[#FF7028] border border-forest-200 dark:border-[#FF7028]/30'
                  : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
              }`}
            >
              {currentDays.length > 0 ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-forest dark:text-[#FF7028]" />
                  <span>
                    {operatingDaysSummary} ({currentDays.length} {currentDays.length === 1 ? 'day' : 'days'}/wk)
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span>0 days selected</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Shortcut Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-[#B8BDC3] mr-1">
            Shortcuts:
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleApplyPresetDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])}
            className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-[#3A3E43] bg-gray-50 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3] hover:border-forest hover:text-forest dark:hover:border-[#FF7028] dark:hover:text-[#FF7028] transition-colors focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
          >
            Weekdays (Mon – Fri)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleApplyPresetDays(['Sat', 'Sun'])}
            className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-[#3A3E43] bg-gray-50 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3] hover:border-forest hover:text-forest dark:hover:border-[#FF7028] dark:hover:text-[#FF7028] transition-colors focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
          >
            Weekends (Sat, Sun)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleApplyPresetDays([...WEEKDAY_CODES])}
            className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-[#3A3E43] bg-gray-50 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3] hover:border-forest hover:text-forest dark:hover:border-[#FF7028] dark:hover:text-[#FF7028] transition-colors focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
          >
            Every day (Mon – Sun)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleApplyPresetDays([])}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-[#3A3E43] bg-gray-50 dark:bg-[#202326] text-gray-500 dark:text-[#B8BDC3] hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-900/60 transition-colors focus:outline-none focus:ring-1 focus:ring-red-500 ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear selection</span>
          </button>
        </div>

        {/* 7 Weekday Multi-Select Buttons */}
        <div
          className={`grid grid-cols-7 gap-1.5 sm:gap-2 p-1.5 rounded-xl border transition-colors ${
            currentDays.length === 0
              ? 'border-red-300 dark:border-red-900/60 bg-red-50/20'
              : 'border-gray-100 dark:border-[#3A3E43] bg-gray-50/50 dark:bg-[#202326]'
          }`}
          role="group"
          aria-label="Operating days selector"
        >
          {WEEKDAY_CODES.map((dayCode) => {
            const isSelected = currentDays.includes(dayCode);
            const fullName = WEEKDAY_FULL_NAMES[dayCode] || dayCode;

            return (
              <button
                key={dayCode}
                type="button"
                disabled={disabled}
                onClick={() => handleToggleDay(dayCode)}
                aria-pressed={isSelected}
                aria-label={`Toggle ${fullName}`}
                title={fullName}
                className={`py-3 sm:py-3.5 px-1 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-0.5 focus:outline-none focus:ring-2 focus:ring-forest dark:focus:ring-[#FF7028] focus:ring-offset-1 select-none ${
                  isSelected
                    ? 'bg-forest dark:bg-[#FF7028] dark:hover:bg-[#F45D16] border-forest dark:border-[#FF7028] text-white shadow-sm ring-1 ring-forest/30 dark:ring-[#FF7028]/30 font-bold'
                    : 'bg-white dark:bg-[#202326] border-gray-200 dark:border-[#3A3E43] text-charcoal dark:text-[#B8BDC3] hover:bg-forest-50/50 dark:hover:bg-[#292D31] dark:hover:text-[#F5F5F5] font-medium'
                }`}
              >
                <span className="text-xs sm:text-sm">{dayCode}</span>
                <span
                  className={`text-[9px] uppercase tracking-wider hidden sm:block ${
                    isSelected ? 'text-forest-100 dark:text-white/80' : 'text-gray-400 dark:text-[#B8BDC3]'
                  }`}
                >
                  {dayCode === 'Sat' || dayCode === 'Sun' ? 'Wknd' : 'Wkdy'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Inline Days Validation Error */}
        {currentDays.length === 0 && (
          <div
            className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">At least one operating day is required</p>
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                Recycling facilities must operate on at least one day per week so customers can schedule intake appointments and capacity can be allocated.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────── */}
      {/* 2. Operating Hours Section */}
      {/* ────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 dark:border-[#3A3E43] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] border border-forest-100 dark:border-[#3A3E43]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">
                Operating Hours
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                Set facility opening and closing hours. Appointment intake slots are distributed within this operational window.
              </p>
            </div>
          </div>

          {/* Quick Schedule Presets */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-[#B8BDC3] mr-1 hidden sm:inline">
              Common Presets:
            </span>
            <div className="inline-flex flex-wrap gap-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleApplyHoursPreset('09:00', '17:00')}
                className="px-2 py-0.5 text-[11px] font-medium rounded border border-gray-200 dark:border-[#3A3E43] bg-gray-50 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3] hover:border-forest hover:text-forest dark:hover:border-[#FF7028] dark:hover:text-[#FF7028] transition-colors"
                title="9:00 AM to 5:00 PM (Standard 8-hour shift)"
              >
                9 AM – 5 PM (Default)
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleApplyHoursPreset('08:30', '17:30')}
                className="px-2 py-0.5 text-[11px] font-medium rounded border border-gray-200 dark:border-[#3A3E43] bg-gray-50 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3] hover:border-forest hover:text-forest dark:hover:border-[#FF7028] dark:hover:text-[#FF7028] transition-colors"
                title="8:30 AM to 5:30 PM (Extended industrial shift)"
              >
                8:30 AM – 5:30 PM
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleApplyHoursPreset('08:00', '16:00')}
                className="px-2 py-0.5 text-[11px] font-medium rounded border border-gray-200 dark:border-[#3A3E43] bg-gray-50 dark:bg-[#202326] text-gray-700 dark:text-[#B8BDC3] hover:border-forest hover:text-forest dark:hover:border-[#FF7028] dark:hover:text-[#FF7028] transition-colors"
                title="8:00 AM to 4:00 PM (Early morning shift)"
              >
                8 AM – 4 PM
              </button>
            </div>
          </div>
        </div>

        {/* Side-by-Side Visual Time Pickers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <VisualTimeCard
            label="Opening Time"
            icon={Sun}
            time24={openingTime}
            onChangeTime={handleOpenTimeChange}
            disabled={disabled}
            badgeText="Facility intake opens"
          />

          <VisualTimeCard
            label="Closing Time"
            icon={Moon}
            time24={closingTime}
            onChangeTime={handleCloseTimeChange}
            disabled={disabled}
            badgeText="Facility intake closes"
          />
        </div>

        {/* Validation / Summary Feedback */}
        {closingTime <= openingTime ? (
          <div
            className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Invalid operating hours schedule
              </p>
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                Closing time ({time24To12(closingTime)}) must be strictly later than opening time ({time24To12(openingTime)}). Overnight operating schedules spanning past midnight are not supported for daytime intake appointments.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-forest-50/50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-forest-900 dark:text-[#F5F5F5]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-forest dark:text-[#FF7028] flex-shrink-0" />
              <span>
                <strong>Operational window:</strong> {time24To12(openingTime)} to {time24To12(closingTime)} ({durationPerDay || '8 hrs'}/operating day)
              </span>
            </div>
            {totalWeeklyHours && (
              <span className="text-[11px] font-semibold text-forest dark:text-[#FF7028] bg-white dark:bg-[#292D31] px-2.5 py-0.5 rounded-full border border-forest-200 dark:border-[#FF7028]/30 self-start sm:self-auto">
                {totalWeeklyHours} total operating capacity / week
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
