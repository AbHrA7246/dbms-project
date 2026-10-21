import React from 'react';
import { Sun, Moon, Monitor, CheckCircle2 } from 'lucide-react';
import { useTheme, THEME_MODES } from '../context/ThemeContext';

export default function ThemeSelector() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options = [
    {
      id: THEME_MODES.LIGHT,
      title: 'Light Theme',
      desc: 'Clean daylight aesthetic with crisp contrast and EcoCycle forest green accents.',
      icon: Sun,
      iconColor: 'text-amber-500 dark:text-amber-400',
      badge: 'Daylight',
    },
    {
      id: THEME_MODES.DARK,
      title: 'Dark Theme',
      desc: 'Deep black and sleek charcoal surfaces with vibrant orange accents optimized for low-light environments.',
      icon: Moon,
      iconColor: 'text-indigo-600 dark:text-[#FF7028]',
      badge: 'Night',
    },
    {
      id: THEME_MODES.SYSTEM,
      title: 'System Default',
      desc: 'Automatically matches your browser or operating system preferred color scheme.',
      icon: Monitor,
      iconColor: 'text-forest dark:text-[#FF7028]',
      badge: `Auto (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">
          Application Appearance &amp; Color Scheme
        </h3>
        <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">
          Choose your interface preference. The selected appearance is applied immediately across all public, customer, and facility portal views.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {options.map((opt) => {
          const isSelected = theme === opt.id;
          const Icon = opt.icon;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-forest bg-forest-50/70 dark:bg-[#FF7028]/15 dark:border-[#FF7028] ring-2 ring-forest/20 dark:ring-[#FF7028]/25 shadow-xs'
                  : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-gray-300 dark:hover:border-[#FF7028]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? 'bg-white dark:bg-[#202326] shadow-2xs'
                      : 'bg-gray-100 dark:bg-[#202326]'
                  }`}>
                    <Icon className={`w-5 h-5 ${opt.iconColor}`} />
                  </div>

                  {isSelected ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-forest dark:text-[#FF7028]">
                      <CheckCircle2 className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                      <span>Active</span>
                    </div>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-[#B8BDC3]">
                      {opt.badge}
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">
                  {opt.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-1 leading-relaxed">
                  {opt.desc}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-gray-100 dark:border-[#3A3E43] flex items-center justify-between text-[11px]">
                <span className="text-gray-400 dark:text-[#B8BDC3]">
                  {opt.id === THEME_MODES.SYSTEM ? `Resolved: ${resolvedTheme}` : opt.badge}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  isSelected ? 'bg-forest dark:bg-[#FF7028]' : 'bg-gray-300 dark:bg-[#3A3E43]'
                }`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
