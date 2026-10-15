import React from 'react';

export default function FeatureCard({ icon: Icon, title, description, badge, highlight }) {
  return (
    <div className="card-eco group relative flex flex-col justify-between hover:border-forest-300">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest group-hover:scale-110 group-hover:bg-forest-100 transition-all duration-300 shadow-sm">
            <Icon className="w-6 h-6 text-forest-700" />
          </div>
          {badge && (
            <span className="badge-eco">
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-charcoal group-hover:text-forest-800 transition-colors">
          {title}
        </h3>

        <p className="text-sm text-charcoal-600 mt-2 leading-relaxed">
          {description}
        </p>
      </div>

      {highlight && (
        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs font-semibold text-emeraldEco">
          <span>Key Outcome:</span>
          <span className="text-charcoal-700 font-normal">{highlight}</span>
        </div>
      )}
    </div>
  );
}

