import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Laptop,
  Smartphone,
  BatteryCharging,
  Tv,
  Printer,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function AcceptedWastePage() {
  const [activeTab, setActiveTab] = useState('accepted');

  const categories = [
    {
      title: 'Computing & IT Hardware',
      icon: Laptop,
      items: [
        'Desktop computer towers & workstations',
        'Laptops, notebooks, and ultrabooks',
        'Computer monitors (LCD, LED, CRT)',
        'Server racks, blade systems, and power supplies',
        'Internal components: motherboards, GPUs, CPUs, RAM',
      ],
      hazardNote: 'Lead solder, mercury backlights, and beryllium alloys',
    },
    {
      title: 'Mobile Devices & Telephony',
      icon: Smartphone,
      items: [
        'Smartphones and feature phones',
        'Tablets, iPads, and e-readers',
        'Smartwatches and fitness trackers',
        'Cellular modems and Wi-Fi routers',
        'Walkie-talkies and landline handsets',
      ],
      hazardNote: 'Lithium battery fire risk, brominated flame retardants',
    },
    {
      title: 'Batteries & Energy Storage',
      icon: BatteryCharging,
      items: [
        'Rechargeable Lithium-ion (Li-ion) battery packs',
        'Uninterruptible Power Supply (UPS) units',
        'Sealed Lead-Acid (SLA) inverter batteries',
        'Nickel-Metal Hydride (NiMH) cells',
        'Power banks and external battery modules',
      ],
      hazardNote: 'Sulfuric acid, corrosive electrolytes, thermal runaway risk',
    },
    {
      title: 'Office & Consumer Electronics',
      icon: Printer,
      items: [
        'Desktop laser and inkjet printers',
        'Flatbed scanners and multifunction units',
        'Keyboards, mice, and docking stations',
        'External hard drives and flash media',
        'Cables, power adapters, and surge protectors',
      ],
      hazardNote: 'Toner micro-particulates, PVC insulation plasticizers',
    },
    {
      title: 'Audio, Visual & Displays',
      icon: Tv,
      items: [
        'Flat screen LED, OLED, and plasma televisions',
        'Audio amplifiers, receivers, and soundbars',
        'Digital cameras and camcorders',
        'Projectors and projection accessories',
        'Video game consoles and game controllers',
      ],
      hazardNote: 'Capacitor fluid, fluorescent lamps, heavy metals',
    },
  ];

  const prohibitedItems = [
    'Radioactive equipment (e.g. medical ionization sources, legacy smoke detectors)',
    'Biohazardous laboratory machinery contaminated with biological fluids',
    'Explosive or pressurized gas cylinders and fire extinguishers',
    'Freon-containing intact large refrigeration compressors',
    'Cracked, leaking liquid acid car batteries without hazardous hazmat containment',
  ];

  return (
    <div className="bg-offwhite text-charcoal dark:bg-[#0A0A0A] dark:text-[#F5F5F5] page-enter">

      {/* 1. Header (White with subtle dot pattern) */}
      <div className="bg-white dark:bg-[#101010] border-b border-gray-200 dark:border-[#3A3E43] bg-dot-pattern py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="text-xs font-semibold text-forest dark:text-[#FF7028] uppercase tracking-wider">
            Material Acceptance Guidelines
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
            Accepted E-Waste Categories
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-[#B8BDC3] leading-relaxed max-w-2xl mx-auto">
            Review the electronic streams our certified partners process, along with handling procedures for hazardous components.
          </p>

          {/* Tab Selector */}
          <div className="pt-4 flex justify-center">
            <div className="bg-gray-100/80 dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] p-1 rounded-lg inline-flex shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab('accepted')}
                className={`px-5 py-2 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'accepted'
                    ? 'bg-white dark:bg-[#292D31] text-forest dark:text-[#FF7028] shadow-xs font-bold'
                    : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                }`}
              >
                Accepted Streams (5 Categories)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('prohibited')}
                className={`px-5 py-2 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'prohibited'
                    ? 'bg-white dark:bg-[#292D31] text-forest dark:text-[#FF7028] shadow-xs font-bold'
                    : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                }`}
              >
                Prohibited &amp; Non-Accepted Items
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Streams Grid (Pale-Sage Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-sage-100/60 dark:bg-[#202326] border-b border-sage-200/80 dark:border-[#3A3E43]">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'accepted' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.title}
                    className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-xl p-6 space-y-4 shadow-xs card-hover"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-forest-700 dark:text-[#FF7028]" />
                      </div>
                      <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                        {cat.title}
                      </h3>
                    </div>

                    <ul className="space-y-1.5 text-xs text-gray-700 dark:text-[#B8BDC3]">
                      {cat.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-forest dark:text-[#FF7028] mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-3 border-t border-gray-100 dark:border-[#3A3E43] text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/50">
                      <strong>Isolated Hazards: </strong>{cat.hazardNote}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-8 sm:p-10 space-y-6 shadow-xs max-w-3xl mx-auto">
              <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <h2 className="text-xl font-bold text-charcoal dark:text-[#F5F5F5]">
                  Items Not Accepted Through Standard Channels
                </h2>
              </div>

              <p className="text-sm text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
                Due to chemical toxicity and transportation safety laws, the following items cannot be accepted via regular collection kiosks or dispatches:
              </p>

              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                {prohibitedItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 bg-red-50/50 dark:bg-red-950/30 p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="text-xs text-gray-500 dark:text-[#B8BDC3] bg-offwhite dark:bg-[#202326] p-4 rounded-lg border border-gray-200 dark:border-[#3A3E43]">
                <strong>Need hazardous waste disposal?</strong> Contact your regional municipal environmental protection bureau for specialized industrial hazardous waste drop days.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Preparation Checklist (White Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0A0A0A] border-b border-gray-200 dark:border-[#3A3E43]">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-charcoal dark:text-[#F5F5F5]">
              Important Device Preparation Checklist
            </h2>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-1">
              Follow these simple precautions prior to drop-off or courier pickup
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-gray-700 dark:text-gray-300">
            <div className="bg-sage-100/50 dark:bg-[#292D31] p-5 rounded-xl border border-sage-200 dark:border-[#3A3E43] space-y-1.5 card-hover">
              <strong className="text-charcoal dark:text-[#F5F5F5] block font-semibold text-sm">1. Personal Data Removal</strong>
              <p className="text-gray-600 dark:text-[#B8BDC3] leading-relaxed">Back up essential files and perform a factory reset. Certified facilities also perform physical data sanitization.</p>
            </div>
            <div className="bg-sage-100/50 dark:bg-[#292D31] p-5 rounded-xl border border-sage-200 dark:border-[#3A3E43] space-y-1.5 card-hover">
              <strong className="text-charcoal dark:text-[#F5F5F5] block font-semibold text-sm">2. Batteries &amp; Power Cells</strong>
              <p className="text-gray-600 dark:text-[#B8BDC3] leading-relaxed">Do not attempt to pierce or open swollen batteries. Place damaged cells in individual non-conductive bags.</p>
            </div>
            <div className="bg-sage-100/50 dark:bg-[#292D31] p-5 rounded-xl border border-sage-200 dark:border-[#3A3E43] space-y-1.5 card-hover">
              <strong className="text-charcoal dark:text-[#F5F5F5] block font-semibold text-sm">3. Accessories &amp; Cables</strong>
              <p className="text-gray-600 dark:text-[#B8BDC3] leading-relaxed">Bundle cords and adapters together with the primary device to streamline component sorting at intake.</p>
            </div>
          </div>

          <div className="pt-6 text-center">
            <Link
              to="/signup"
              className="btn-primary text-sm px-6 py-2.5 shadow-sm"
            >
              <span>Create account &amp; register hardware</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
