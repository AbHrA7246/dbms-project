import React from 'react';

export default function MetricCard({ icon: Icon, value, label, subtext, accentColor = 'forest' }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest group-hover:scale-105 group-hover:bg-forest-100 transition-all duration-200">
          <Icon className="w-6 h-6 text-forest-700" />
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-forest-50 text-forest-700 border border-forest-200/60">
          Simulated
        </span>
      </div>

      <div className="text-3xl font-extrabold text-charcoal tracking-tight">
        {value}
      </div>
      <div className="text-sm font-semibold text-charcoal-700 mt-1">
        {label}
      </div>
      {subtext && (
        <p className="text-xs text-charcoal-400 mt-1.5 leading-relaxed">
          {subtext}
        </p>
      )}
    </div>
  );
}

