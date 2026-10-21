import React from 'react';

export default function MetricCard({ icon: Icon, value, label, subtext, accentColor = 'forest' }) {
  return (
    <div className="bg-white dark:bg-[#292D31] rounded-xl p-6 border border-gray-200/80 dark:border-[#3A3E43] shadow-sm hover:shadow-md dark:hover:border-[#FF7028]/40 transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 rounded-xl bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028] group-hover:scale-105 group-hover:bg-forest-100 dark:group-hover:bg-[#292D31] transition-all duration-200">
          <Icon className="w-6 h-6 text-forest-700 dark:text-[#FF7028]" />
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-forest-50 dark:bg-[#FF7028]/15 text-forest-700 dark:text-[#FF7028] border border-forest-200/60 dark:border-[#FF7028]/30">
          Live
        </span>
      </div>

      <div className="text-3xl font-extrabold text-charcoal dark:text-[#F5F5F5] tracking-tight">
        {value}
      </div>
      <div className="text-sm font-semibold text-charcoal-700 dark:text-[#F5F5F5] mt-1">
        {label}
      </div>
      {subtext && (
        <p className="text-xs text-charcoal-400 dark:text-[#B8BDC3] mt-1.5 leading-relaxed">
          {subtext}
        </p>
      )}
    </div>
  );
}

