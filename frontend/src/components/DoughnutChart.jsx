import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { CHART_PALETTES, CATEGORY_COLORS } from '../constants/themeTokens';

/**
 * Interactive SVG Doughnut Chart Component
 * 
 * Provides:
 * - Pure SVG rendering with no heavy external dependencies
 * - Hover, click, and touch segment highlight
 * - Center readout displaying total or hovered segment details
 * - Floating tooltip with category name, value, and percentage
 * - Interactive legend synchronised with chart segments
 * - Accessible empty state
 * - Unified brand orange & charcoal palettes across Light and Dark themes
 */
export default function DoughnutChart({
  data = [],
  total = 0,
  unit = 'kg',
  title = '',
  emptyMessage = 'Category insights will appear as e-waste is received.',
  centerLabel = 'Total Intake',
}) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, item: null });

  let isDark = false;
  try {
    const themeCtx = useTheme();
    isDark = themeCtx.isDark;
  } catch (e) {
    if (typeof document !== 'undefined') {
      isDark = document.documentElement.classList.contains('dark');
    }
  }

  const PALETTE = isDark ? CHART_PALETTES.dark : CHART_PALETTES.light;

  const validItems = (Array.isArray(data) ? data : []).filter(
    (item) => Number(item.value) > 0
  );

  const totalValue = validItems.reduce((acc, curr) => acc + Number(curr.value), 0);

  if (validItems.length === 0 || totalValue <= 0) {
    return (
      <div className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-8 text-center space-y-3 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center mx-auto text-forest dark:text-[#FF7028]">
          <svg className="w-6 h-6 text-forest-700 dark:text-[#FF7028]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-charcoal dark:text-[#F5F5F5]">{title || 'Intake Breakdown'}</h4>
        <p className="text-xs text-gray-500 dark:text-[#B8BDC3] max-w-sm mx-auto leading-relaxed">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Pre-calculate angles for segments
  const size = 260;
  const center = size / 2;
  const baseOuterR = 98;
  const activeOuterR = 106;
  const innerR = 64;

  let cumulativeAngle = -Math.PI / 2; // Start at top (12 o'clock)
  const segments = validItems.map((item, idx) => {
    const fraction = item.value / totalValue;
    const startAngle = cumulativeAngle;
    const angleDelta = fraction * 2 * Math.PI;
    const endAngle = cumulativeAngle + angleDelta;
    cumulativeAngle = endAngle;

    const percentage = item.percentage !== undefined
      ? item.percentage
      : Math.round(fraction * 100);

    // Resolve color using semantic category mapping, explicit theme color, or theme palette
    const catKey = (item.key || item.category || item.label || '').toLowerCase();
    let color = null;

    for (const [key, map] of Object.entries(CATEGORY_COLORS)) {
      if (catKey.includes(key)) {
        color = isDark ? map.dark : map.light;
        break;
      }
    }

    if (!color) {
      if (isDark && item.darkColor) {
        color = item.darkColor;
      } else if (item.color) {
        if (item.color === '#2D7A58' || item.color === '#1A3D2F') {
          color = isDark ? '#FF7028' : '#F45D16';
        } else if (item.color === '#62C498' || item.color === '#0D9488') {
          color = isDark ? '#6B7280' : '#4B5563';
        } else {
          color = item.color;
        }
      } else {
        color = PALETTE[idx % PALETTE.length];
      }
    }

    return {
      ...item,
      idx,
      fraction,
      startAngle,
      endAngle,
      percentage,
      color,
    };
  });

  const activeItem = activeIndex !== null ? segments[activeIndex] : null;

  const handlePointerEnter = (item, e) => {
    setActiveIndex(item.idx);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      item,
    });
  };

  const handlePointerMove = (item, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      item,
    }));
  };

  const handlePointerLeave = () => {
    setActiveIndex(null);
    setTooltip({ visible: false, x: 0, y: 0, item: null });
  };

  const handleSegmentClick = (idx) => {
    setActiveIndex(activeIndex === idx ? null : idx);
  };

  return (
    <div className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xs transition-all hover:border-gray-300 dark:hover:border-[#FF7028]/40">
      {/* Chart Title Header */}
      {title && (
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-charcoal dark:text-[#F5F5F5] tracking-tight">
              {title}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
              Verified intake proportion ({unit})
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] border border-forest-100 dark:border-[#3A3E43]">
            {total || totalValue} {unit}
          </span>
        </div>
      )}

      {/* Main Chart + Legend Layout */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-8">
        
        {/* SVG Doughnut Container */}
        <div 
          className="relative flex items-center justify-center shrink-0" 
          style={{ width: size, height: size }}
          onPointerLeave={handlePointerLeave}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible select-none"
            role="img"
            aria-label={`${title} Doughnut Chart`}
          >
            {/* If there's only 1 segment (100%), render clean concentric circle */}
            {segments.length === 1 ? (
              <circle
                cx={center}
                cy={center}
                r={(baseOuterR + innerR) / 2}
                fill="none"
                stroke={segments[0].color}
                strokeWidth={baseOuterR - innerR}
                className="cursor-pointer transition-all duration-300 hover:opacity-90"
                onClick={() => handleSegmentClick(0)}
                onPointerEnter={(e) => handlePointerEnter(segments[0], e)}
                onPointerMove={(e) => handlePointerMove(segments[0], e)}
              />
            ) : (
              segments.map((seg) => {
                const isActive = activeIndex === seg.idx;
                const rOut = isActive ? activeOuterR : baseOuterR;

                // Subtle angle gap for visual separation
                const gap = 0.02;
                const actualStart = seg.startAngle + gap / 2;
                const actualEnd = seg.endAngle - gap / 2;

                const x1 = center + rOut * Math.cos(actualStart);
                const y1 = center + rOut * Math.sin(actualStart);
                const x2 = center + rOut * Math.cos(actualEnd);
                const y2 = center + rOut * Math.sin(actualEnd);

                const x3 = center + innerR * Math.cos(actualEnd);
                const y3 = center + innerR * Math.sin(actualEnd);
                const x4 = center + innerR * Math.cos(actualStart);
                const y4 = center + innerR * Math.sin(actualStart);

                const largeArc = seg.fraction > 0.5 ? 1 : 0;

                const pathData = [
                  `M ${x1} ${y1}`,
                  `A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2}`,
                  `L ${x3} ${y3}`,
                  `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
                  'Z',
                ].join(' ');

                return (
                  <path
                    key={seg.idx}
                    d={pathData}
                    fill={seg.color}
                    className="cursor-pointer transition-all duration-200"
                    style={{
                      opacity: activeIndex === null || isActive ? 1 : 0.45,
                      filter: isActive ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                    }}
                    onClick={() => handleSegmentClick(seg.idx)}
                    onPointerEnter={(e) => handlePointerEnter(seg, e)}
                    onPointerMove={(e) => handlePointerMove(seg, e)}
                  />
                );
              })
            )}

            {/* Inner Center Circle with Subtle Ring */}
            <circle
              cx={center}
              cy={center}
              r={innerR - 1}
              className="fill-white dark:fill-[#292D31] pointer-events-none"
            />
          </svg>

          {/* Center HTML Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
            {activeItem ? (
              <div className="space-y-0.5 animate-fadeIn">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#B8BDC3] block line-clamp-1 max-w-[100px]">
                  {activeItem.label}
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-charcoal dark:text-[#F5F5F5] block leading-none">
                  {activeItem.value}
                  <span className="text-xs font-normal text-gray-500 dark:text-[#B8BDC3] font-sans ml-0.5">{unit}</span>
                </span>
                <span 
                  className="text-xs font-bold font-mono inline-block px-1.5 py-0.5 rounded text-white mt-1"
                  style={{ backgroundColor: activeItem.color }}
                >
                  {activeItem.percentage}%
                </span>
              </div>
            ) : (
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#B8BDC3] block">
                  {centerLabel}
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-charcoal dark:text-[#F5F5F5] block leading-none">
                  {total || totalValue}
                  <span className="text-xs font-normal text-gray-500 dark:text-[#B8BDC3] font-sans ml-0.5">{unit}</span>
                </span>
                <span className="text-[10px] text-gray-400 dark:text-[#B8BDC3] font-medium block">
                  {validItems.length} {validItems.length === 1 ? 'stream' : 'streams'}
                </span>
              </div>
            )}
          </div>

          {/* Floating Tooltip */}
          {tooltip.visible && tooltip.item && (
            <div
              className="absolute z-20 pointer-events-none bg-charcoal dark:bg-[#202326] dark:border dark:border-[#3A3E43] text-white rounded-lg px-2.5 py-1.5 text-xs shadow-lg space-y-0.5 transition-all -translate-x-1/2 -translate-y-12 whitespace-nowrap"
              style={{
                left: Math.max(50, Math.min(size - 50, tooltip.x)),
                top: Math.max(30, tooltip.y),
              }}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltip.item.color }} />
                <span>{tooltip.item.label}</span>
              </div>
              <div className="text-[11px] text-gray-300 dark:text-[#B8BDC3] font-mono flex items-center justify-between gap-3">
                <span>{tooltip.item.value} {unit}</span>
                <span className="text-[#FF7028] font-bold">{tooltip.item.percentage}%</span>
              </div>
            </div>
          )}

        </div>

        {/* Legend Beside/Below Chart */}
        <div className="flex-1 w-full space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#B8BDC3] pb-1 border-b border-gray-100 dark:border-[#3A3E43]">
            Intake Distribution
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {segments.map((seg) => {
              const isSelected = activeIndex === seg.idx;
              return (
                <button
                  key={seg.idx}
                  type="button"
                  onClick={() => handleSegmentClick(seg.idx)}
                  onPointerEnter={(e) => handlePointerEnter(seg, e)}
                  onPointerLeave={handlePointerLeave}
                  className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors border ${
                    isSelected
                      ? 'bg-forest-50/80 dark:bg-[#202326] border-forest-300 dark:border-[#FF7028] shadow-2xs font-semibold'
                      : 'hover:bg-gray-50 dark:hover:bg-[#202326] border-transparent text-gray-700 dark:text-[#B8BDC3]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span
                      className="w-3 h-3 rounded-md shrink-0 transition-transform"
                      style={{
                        backgroundColor: seg.color,
                        transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                    <span className="truncate text-charcoal dark:text-[#F5F5F5]">{seg.label}</span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 font-mono text-[11px]">
                    <span className="text-gray-500 dark:text-[#B8BDC3]">{seg.value} {unit}</span>
                    <span className="font-bold text-[#F45D16] dark:text-[#FF7028] w-9 text-right">{seg.percentage}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
