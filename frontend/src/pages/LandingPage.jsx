import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Laptop,
  Smartphone,
  BatteryCharging,
  Tv,
  ShieldCheck,
  Recycle,
  CheckCircle2,
  PackageCheck,
  Truck,
  Building2,
  Cpu,
  Leaf,
  Layers
} from 'lucide-react';

export default function LandingPage() {
  const steps = [
    {
      number: '01',
      title: 'Register your items',
      description: 'Enter your device category, brand, and condition to create a verified recycling record.',
      icon: PackageCheck,
    },
    {
      number: '02',
      title: 'Choose drop-off or pickup',
      description: 'Select an authorized municipal depot or book a doorstep collection slot.',
      icon: Truck,
    },
    {
      number: '03',
      title: 'Certified processing',
      description: 'Licensed facilities disassemble, depollute hazards, and reclaim circular raw materials.',
      icon: Building2,
    },
  ];

  const categories = [
    {
      title: 'Computers & Laptops',
      description: 'Desktops, laptops, monitors, motherboards, keyboards, and server storage.',
      icon: Laptop,
    },
    {
      title: 'Mobile & Tablets',
      description: 'Smartphones, feature phones, tablets, e-readers, and smart wearables.',
      icon: Smartphone,
    },
    {
      title: 'Batteries & Power',
      description: 'Rechargeable lithium cells, UPS backups, power supplies, and adapters.',
      icon: BatteryCharging,
    },
    {
      title: 'Consumer Electronics',
      description: 'Televisions, audio equipment, networking routers, and small office electronics.',
      icon: Tv,
    },
  ];

  return (
    <div className="bg-offwhite text-charcoal page-enter">

      {/* 1. HERO SECTION (White with subtle green gradient & low-opacity dot pattern) */}
      <section className="relative border-b border-gray-200 bg-white bg-dot-pattern overflow-hidden">
        {/* Subtle green ambient gradient */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-forest-50/60 via-mintEco/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left Column: Hero Copy & Actions */}
            <div className="lg:col-span-6 space-y-6">

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-forest-50 text-forest border border-forest-100 shadow-xs">
                <Recycle className="w-3.5 h-3.5 text-forest-700" />
                <span>E-Waste Management &amp; Recycling Optimization</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-charcoal leading-[1.12]">
                Responsible e-waste disposal and recycling optimization.
              </h1>

              <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
                A streamlined platform to register surplus electronics, locate certified collection centers, and track recycling requests through verified recovery channels.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/signup"
                  className="btn-primary text-sm px-6 py-3 font-semibold shadow-sm"
                >
                  <span>Get started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/how-it-works"
                  className="btn-secondary text-sm px-6 py-3 font-semibold"
                >
                  <span>How it works</span>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-forest-700" />
                  R2v3 &amp; e-Stewards Compliant
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-forest-700" />
                  DoD 5220.22-M Data Sanitization
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-forest-700" />
                  Zero-Landfill Protocol
                </span>
              </div>

            </div>

            {/* Right Column: High-Quality Hero Visual with Restrained Floating Manifest */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-2xl overflow-hidden border border-gray-200/90 shadow-md group">

                {/* Hero Editorial Photograph */}
                <img
                  src="/hero-ewaste-recycling.jpg"
                  alt="Orderly disassembled electronic waste recycling on a modern workbench"
                  className="w-full h-80 sm:h-96 object-cover object-center group-hover:scale-[1.01] transition-transform duration-500"
                  loading="eager"
                />

                {/* Subtle gradient vignette at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/15 to-transparent pointer-events-none" />

                {/* Restrained Overlay Card */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-xl p-4 border border-white/40 shadow-lg text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emeraldEco animate-pulse" />
                      <span className="font-mono text-[11px] font-bold text-forest">MANIFEST #EW-1042</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Chain-of-Custody Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-gray-400 block">Intake Device</span>
                      <strong className="text-charcoal font-semibold">Dell Latitude • Li-ion Cells</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Material Circularity</span>
                      <strong className="text-forest font-semibold">98% High-Grade Metals Salvaged</strong>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. COMPACT HOW IT WORKS (Pale-Sage Section Background) */}
      <section id="how-it-works" className="py-20 border-b border-sage-200/80 bg-sage-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-semibold text-forest uppercase tracking-wider">
              Simple 3-Step Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal">
              How it works
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Three straightforward steps to dispose of electronic surplus responsibly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="bg-white border border-gray-200/90 rounded-xl p-6 space-y-4 card-hover shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-forest-50 border border-forest-100 flex items-center justify-center text-forest shadow-xs">
                      <Icon className="w-5 h-5 text-forest-700" />
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-400">
                      {step.number}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-charcoal">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:text-forest-900 transition-colors group"
            >
              <span>Explore the comprehensive 4-stage technical workflow</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

        </div>
      </section>

      {/* 3. CONCISE ACCEPTED CATEGORIES (White Background with Subtle Grid Pattern) */}
      <section className="py-20 border-b border-gray-200 bg-white bg-circuit-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-semibold text-forest uppercase tracking-wider">
              Supported Electronics
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal">
              Accepted e-waste categories
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              We coordinate recycling for everyday personal, household, and enterprise hardware.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.title}
                  className="bg-white border border-gray-200 rounded-xl p-6 space-y-3 card-hover shadow-xs hover:border-forest-200"
                >
                  <div className="w-10 h-10 rounded-lg bg-forest-50 text-forest flex items-center justify-center">
                    <Icon className="w-5 h-5 text-forest-700" />
                  </div>
                  <h3 className="text-base font-semibold text-charcoal">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/accepted-waste"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:underline"
            >
              <span>View full acceptance checklist and handling procedures</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* 4. RESPONSIBLE RECYCLING (Pale-Sage Section Background) */}
      <section className="py-20 bg-sage-100/60 border-b border-sage-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-semibold text-forest uppercase tracking-wider">
                Certified Compliance
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal">
                Why responsible e-waste handling matters.
              </h2>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                When disposed of in ordinary landfills, electronics release heavy metals that pollute soil and groundwater. Proper recycling isolates hazards while recovering valuable secondary raw materials.
              </p>

              <div className="pt-2 space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-forest mt-0.5 shrink-0" />
                  <span><strong>Hazard containment:</strong> Neutralizes lead, mercury, and flame retardants under strict standards.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-forest mt-0.5 shrink-0" />
                  <span><strong>Material circularity:</strong> Reclaims copper, silver, and gold to reduce energy required for virgin mining.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-forest mt-0.5 shrink-0" />
                  <span><strong>Verified custody:</strong> Partner centers provide traceable documentation from intake to final dismantling.</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white border border-gray-200 rounded-xl p-8 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest flex items-center justify-center mx-auto">
                <Leaf className="w-6 h-6 text-forest-700" />
              </div>
              <h3 className="text-xl font-bold text-charcoal">
                Ready to recycle your equipment?
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Create an account in seconds to schedule collections, record items, and access certified records.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/signup"
                  className="btn-primary text-sm px-6 py-2.5 shadow-sm"
                >
                  Create an account
                </Link>
                <Link
                  to="/how-it-works"
                  className="btn-secondary text-sm px-6 py-2.5"
                >
                  Learn how it works
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
