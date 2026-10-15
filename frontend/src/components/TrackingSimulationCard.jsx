import React, { useState } from 'react';
import {
  Package,
  Truck,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Leaf
} from 'lucide-react';

export default function TrackingSimulationCard() {
  const [currentStep, setCurrentStep] = useState(2); // 0: Registered, 1: Assigned, 2: In Transit, 3: Completed

  const steps = [
    { title: 'Registered', date: 'Oct 14, 09:30 AM', icon: Package, desc: 'Items logged with specs' },
    { title: 'Hub Assigned', date: 'Oct 14, 02:15 PM', icon: Building2, desc: 'Metro EcoRecycle Hub #4' },
    { title: 'In Transit', date: 'Today, 10:45 AM', icon: Truck, desc: 'Courier en route to hub' },
    { title: 'Certified Recycled', date: 'Estimated Oct 16', icon: CheckCircle2, desc: 'Zero-landfill smelting' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xl shadow-forest/10 p-6 md:p-7 relative overflow-hidden">
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-forest via-emeraldEco to-mintEco" />

      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-forest-700 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
              ID: #EW-2026-8942
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emeraldEco bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emeraldEco animate-ping" />
              Live Simulation
            </span>
          </div>
          <h4 className="text-base font-bold text-charcoal mt-1">
            Doorstep Collection &amp; Recycling Order
          </h4>
        </div>

        <div className="text-right">
          <span className="text-xs text-charcoal-400 block">Assigned Recycler</span>
          <span className="text-xs font-bold text-charcoal-800 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-forest" />
            GreenTech Facilities (R2)
          </span>
        </div>
      </div>

      {/* Item summary tags */}
      <div className="py-3.5 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-offwhite-100 p-2.5 rounded-lg border border-gray-100">
          <span className="text-charcoal-400 block mb-0.5">Declared Devices</span>
          <span className="font-semibold text-charcoal-800">
            1x ThinkPad T490 + 2x Li-ion Cells
          </span>
        </div>
        <div className="bg-offwhite-100 p-2.5 rounded-lg border border-gray-100">
          <span className="text-charcoal-400 block mb-0.5">Estimated Footprint Offset</span>
          <span className="font-semibold text-forest flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5 text-mintEco" />
            ~34.8 kg CO₂e Diverted
          </span>
        </div>
      </div>

      {/* Timeline Steps */}
      <div className="py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-charcoal-400">
            Chain-of-Custody Timeline
          </span>
          <span className="text-[11px] text-charcoal-400">
            Click step to simulate update
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx <= currentStep;
            const isCurrent = idx === currentStep;

            return (
              <button
                key={step.title}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? 'bg-forest-50/70 border-forest-400 ring-2 ring-forest/20 shadow-sm'
                    : isCompleted
                    ? 'bg-white border-forest-200 hover:border-forest-300'
                    : 'bg-gray-50/70 border-gray-200 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isCompleted ? 'bg-forest text-white' : 'bg-gray-200 text-charcoal-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
                  )}
                </div>
                <div className="text-xs font-bold text-charcoal truncate">
                  {step.title}
                </div>
                <div className="text-[10px] text-charcoal-400 mt-0.5">
                  {step.date}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card Footer status strip */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-charcoal-600">
          <Clock className="w-3.5 h-3.5 text-forest-600" />
          <span>Status: </span>
          <strong className="text-forest-800">{steps[currentStep].title}</strong>
          <span className="hidden sm:inline text-charcoal-400">— {steps[currentStep].desc}</span>
        </div>

        <div className="flex items-center gap-1 text-forest font-semibold hover:underline cursor-pointer">
          <span>View Audit Log</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

