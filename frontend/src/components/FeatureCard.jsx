import React from 'react';

export default function FeatureCard({ icon: Icon, title, description, badge, highlight }) {
  return (
    <div className="bg-white dark:bg-[#292D31] rounded-xl p-6 border border-gray-200/90 dark:border-[#3A3E43] shadow-xs group relative flex flex-col justify-between hover:border-forest-300 dark:hover:border-[#FF7028]/40 transition-all">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028] group-hover:scale-110 group-hover:bg-forest-100 dark:group-hover:bg-[#292D31] transition-all duration-300 shadow-sm">
            <Icon className="w-6 h-6 text-forest-700 dark:text-[#FF7028]" />
          </div>
          {badge && (
            <span className="badge-eco">
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-charcoal dark:text-[#F5F5F5] group-hover:text-forest-800 dark:group-hover:text-[#FF7028] transition-colors">
          {title}
        </h3>

        <p className="text-sm text-charcoal-600 dark:text-[#B8BDC3] mt-2 leading-relaxed">
          {description}
        </p>
      </div>

      {highlight && (
        <div className="mt-5 pt-3 border-t border-gray-100 dark:border-[#3A3E43] flex items-center gap-1.5 text-xs font-semibold text-[#F45D16] dark:text-[#FF7028]">
          <span>Key Outcome:</span>
          <span className="text-charcoal-700 dark:text-[#B8BDC3] font-normal">{highlight}</span>
        </div>
      )}
    </div>
  );
}

