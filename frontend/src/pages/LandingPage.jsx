import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Laptop,
  Smartphone,
  BatteryCharging,
  Tv,
  ShieldCheck,
  PackageCheck,
  Truck,
  Building2,
  Cpu,
  Leaf,
  Layers,
  Scale,
  Sparkles,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCentreAuth } from '../context/CentreAuthContext';
import { useDirectory } from '../context/DirectoryContext';
import { storageService } from '../services/storageService';
import DoughnutChart from '../components/DoughnutChart';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { isCentreAuthenticated } = useCentreAuth();
  const { openDirectory } = useDirectory();
  const [impactStats, setImpactStats] = useState(() => storageService.getEnvironmentalImpactStats());
  const [metricMode, setMetricMode] = useState('weight'); // 'weight' | 'units'

  useEffect(() => {
    const updateStats = () => {
      setImpactStats(storageService.getEnvironmentalImpactStats());
    };

    updateStats();
    window.addEventListener('storage', updateStats);
    window.addEventListener('ecocycle_storage_update', updateStats);
    return () => {
      window.removeEventListener('storage', updateStats);
      window.removeEventListener('ecocycle_storage_update', updateStats);
    };
  }, []);

  const steps = [
    {
      number: '01',
      title: 'Declare Hardware',
      description: 'Enter your device category, specifications, and choose between facility drop-off or doorstep courier pickup.',
      icon: PackageCheck,
    },
    {
      number: '02',
      title: 'Select Facility & Schedule',
      description: 'Choose a verified regional recycling centre with available capacity and reserve your intake appointment.',
      icon: Truck,
    },
    {
      number: '03',
      title: 'Tracked Intake & Recovery',
      description: 'Follow 3-stage custody transitions: from submission through appointment booking to physical receipt and depollution.',
      icon: Building2,
    },
  ];

  const categories = [
    {
      title: 'Computers & Laptops',
      description: 'Desktops, laptops, workstations, motherboards, solid-state drives, and server hardware.',
      icon: Laptop,
    },
    {
      title: 'Smartphones & Tablets',
      description: 'Smartphones, feature phones, cellular tablets, e-readers, and smart wearables.',
      icon: Smartphone,
    },
    {
      title: 'Batteries & Power Units',
      description: 'Lithium-ion cells, UPS backups, transformers, rechargeable packs, and power adapters.',
      icon: BatteryCharging,
    },
    {
      title: 'Displays & Peripherals',
      description: 'Monitors, televisions, audio equipment, networking switches, and office electronics.',
      icon: Tv,
    },
  ];

  // Prepare data for Doughnut Charts strictly from verified records
  const categoryChartData = (impactStats.categoryDistribution || []).map((cat) => ({
    label: cat.label,
    value: metricMode === 'weight' ? cat.weightKg : cat.itemCount,
    percentage: metricMode === 'weight' ? cat.percentageByWeight : cat.percentageByUnits,
    key: cat.key,
  }));

  const methodChartData = (impactStats.methodDistribution || []).map((m) => ({
    label: m.label,
    value: metricMode === 'weight' ? m.weightKg : m.itemCount,
    percentage: metricMode === 'weight' ? m.percentageByWeight : m.percentageByUnits,
    color: m.color,
    key: m.key,
  }));

  const chartUnit = metricMode === 'weight' ? 'kg' : 'units';
  const chartTotal = metricMode === 'weight' ? impactStats.totalReceivedKg : impactStats.totalReceivedItems;

  return (
    <div className="bg-offwhite text-charcoal dark:bg-[#0A0A0A] dark:text-[#F5F5F5] page-enter">

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION (Image-Led, Premium, Minimal, Inspiring) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] sm:min-h-[80vh] flex items-center justify-center overflow-hidden bg-forest-950 text-white">
        
        {/* Full-width Genuine Environmental Recycling Photograph Background */}
        <img
          src="/hero-ewaste-recycling.jpg"
          alt="Green printed circuit boards sorted and prepared for material recovery and electronics recycling"
          className="absolute inset-0 w-full h-full object-cover object-center scale-100"
          loading="eager"
        />

        {/* Theme-Aware Gradient Overlays for Readability and Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950/95 via-forest-950/80 to-forest-950/40 dark:from-[#0A0A0A]/95 dark:via-[#0A0A0A]/85 dark:to-[#0A0A0A]/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent to-black/30 dark:from-[#0A0A0A] dark:via-transparent dark:to-black/40 pointer-events-none" />

        {/* Subtle Photo Credit Badge */}
        <div className="hidden sm:block absolute bottom-3 right-4 z-10 text-[10px] text-white/50 bg-black/40 backdrop-blur-xs px-2.5 py-0.5 rounded pointer-events-auto">
          <span>Photo: Crista Castellanos / Wikimedia Commons (CC BY-SA 4.0)</span>
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 w-full">
          <div className="max-w-2xl space-y-7">
            
            {/* Inspiring Central Message Kicker */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-[#FF7028] dark:text-[#FF7028] border border-white/15 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#FF7028] dark:text-[#FF7028]" />
              <span>Look at the difference we've made. Imagine what we can achieve together.</span>
            </div>

            {/* Expressive Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]">
              Turning electronic waste into a better future.
            </h1>

            {/* Concise Supporting Sentence */}
            <p className="text-base sm:text-lg text-gray-200 leading-relaxed font-normal max-w-xl">
              EcoCycle connects individuals and organisations with verified recycling facilities to recover essential raw materials and ensure zero-landfill disposal.
            </p>

            {/* Context-Aware Hero Actions (Public / Customer / Centre Manager) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              {isCentreAuthenticated ? (
                <>
                  <Link
                    to="/centre/requests"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#FF7028] dark:bg-[#FF7028] text-white hover:bg-[#F45D16] dark:hover:bg-[#F45D16] font-bold text-sm transition-all shadow-md hover:shadow-lg"
                  >
                    <span>View Assigned Requests</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    to="/centre/appointments"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-sm border border-white/20 transition-all"
                  >
                    <span>Manage Appointments</span>
                  </Link>
                </>
              ) : isAuthenticated ? (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#FF7028] dark:bg-[#FF7028] text-white hover:bg-[#F45D16] dark:hover:bg-[#F45D16] font-bold text-sm transition-all shadow-md hover:shadow-lg"
                  >
                    <span>Register E-Waste</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    to="/requests"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-sm border border-white/20 transition-all"
                  >
                    <span>View My Requests</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#FF7028] dark:bg-[#FF7028] text-white hover:bg-[#F45D16] dark:hover:bg-[#F45D16] font-bold text-sm transition-all shadow-md hover:shadow-lg"
                  >
                    <span>Register E-Waste</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <a
                    href="#impact"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-sm border border-white/20 transition-all"
                  >
                    <span>Explore Our Impact</span>
                  </a>
                </>
              )}
            </div>

            {/* Hero Verified Statistics (Integrated Naturally with Restrained Separators) */}
            <div className="pt-8 border-t border-white/15 flex flex-wrap items-center gap-x-8 gap-y-4">
              {impactStats.hasReceivedData ? (
                <>
                  <div className="space-y-0.5">
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-white leading-none">
                      {impactStats.totalReceivedKg} <span className="text-xs font-normal text-gray-300 font-sans">kg</span>
                    </div>
                    <div className="text-[11px] font-medium text-gray-300 uppercase tracking-wider">
                      E-Waste Diverted
                    </div>
                  </div>

                  <div className="h-8 w-px bg-white/20 hidden sm:block" />

                  <div className="space-y-0.5">
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-white leading-none">
                      {impactStats.totalReceivedItems} <span className="text-xs font-normal text-gray-300 font-sans">units</span>
                    </div>
                    <div className="text-[11px] font-medium text-gray-300 uppercase tracking-wider">
                      Hardware Recovered
                    </div>
                  </div>

                  <div className="h-8 w-px bg-white/20 hidden sm:block" />

                  <div className="space-y-0.5">
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-white leading-none">
                      {impactStats.totalParticipatingCentres}
                    </div>
                    <div className="text-[11px] font-medium text-gray-300 uppercase tracking-wider">
                      Partner Facilities
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-0.5">
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-white leading-none">
                      {impactStats.totalParticipatingCentres}
                    </div>
                    <div className="text-[11px] font-medium text-gray-300 uppercase tracking-wider">
                      Partner Depots in Network
                    </div>
                  </div>

                  <div className="h-8 w-px bg-white/20 hidden sm:block" />

                  <div className="space-y-0.5">
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-[#FF7028] leading-none">
                      100%
                    </div>
                    <div className="text-[11px] font-medium text-gray-300 uppercase tracking-wider">
                      Verified Custody Tracking
                    </div>
                  </div>

                  <div className="h-8 w-px bg-white/20 hidden sm:block" />

                  <div className="space-y-0.5">
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-white leading-none">
                      R2v3 / e-Stewards
                    </div>
                    <div className="text-[11px] font-medium text-gray-300 uppercase tracking-wider">
                      Depollution Benchmark
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. OUR IMPACT, MADE VISIBLE (Genuine Data & Metrics) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section id="impact" className="py-20 border-b border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] border border-forest-100 dark:border-[#3A3E43]">
              <BarChart3 className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
              <span>Verified Custody Metrics</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
              Our Impact, Made Visible
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              Every item diverted represents hazardous heavy elements contained and finite raw minerals returned to circular manufacturing.
            </p>
          </div>

          {/* Key Impact Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Total Recorded Weight */}
            <div className="bg-offwhite dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-6 space-y-2 shadow-2xs hover:border-gray-300 dark:hover:border-[#FF7028]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028]">
                <Scale className="w-5 h-5 text-forest-700 dark:text-[#FF7028]" />
              </div>
              <div className="pt-2">
                <div className="text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5] font-mono">
                  {impactStats.totalReceivedKg} <span className="text-sm font-normal text-gray-500 dark:text-[#B8BDC3] font-sans">kg</span>
                </div>
                <div className="text-xs font-bold text-gray-700 dark:text-[#F5F5F5] mt-1 uppercase tracking-wider">
                  E-Waste Physically Received
                </div>
                <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3] mt-1">
                  Verified hardware intake recorded at certified depots
                </p>
              </div>
            </div>

            {/* Total Items Received */}
            <div className="bg-offwhite dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-6 space-y-2 shadow-2xs hover:border-gray-300 dark:hover:border-[#FF7028]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028]">
                <PackageCheck className="w-5 h-5 text-forest-700 dark:text-[#FF7028]" />
              </div>
              <div className="pt-2">
                <div className="text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5] font-mono">
                  {impactStats.totalReceivedItems} <span className="text-sm font-normal text-gray-500 dark:text-[#B8BDC3] font-sans">units</span>
                </div>
                <div className="text-xs font-bold text-gray-700 dark:text-[#F5F5F5] mt-1 uppercase tracking-wider">
                  Hardware Units Recovered
                </div>
                <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3] mt-1">
                  Across {impactStats.totalReceivedRequests} verified custody receipts
                </p>
              </div>
            </div>

            {/* Participating Hubs */}
            <div className="bg-offwhite dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-6 space-y-2 shadow-2xs hover:border-gray-300 dark:hover:border-[#FF7028]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028]">
                <Building2 className="w-5 h-5 text-forest-700 dark:text-[#FF7028]" />
              </div>
              <div className="pt-2">
                <div className="text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5] font-mono">
                  {impactStats.totalParticipatingCentres}
                </div>
                <div className="text-xs font-bold text-gray-700 dark:text-[#F5F5F5] mt-1 uppercase tracking-wider">
                  Registered Recycling Hubs
                </div>
                <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3] mt-1">
                  Authorized regional depollution &amp; sorting facilities
                </p>
              </div>
            </div>

            {/* Active Collection Pipeline */}
            <div className="bg-offwhite dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-6 space-y-2 shadow-2xs hover:border-gray-300 dark:hover:border-[#FF7028]/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028]">
                <Truck className="w-5 h-5 text-forest-700 dark:text-[#FF7028]" />
              </div>
              <div className="pt-2">
                <div className="text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5] font-mono">
                  {impactStats.activePipelineCount}
                </div>
                <div className="text-xs font-bold text-gray-700 dark:text-[#F5F5F5] mt-1 uppercase tracking-wider">
                  Active Collection Pipeline
                </div>
                <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3] mt-1">
                  Collections currently scheduled or en route
                </p>
              </div>
            </div>

          </div>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* 3. INTERACTIVE PIE & DOUGHNUT CHARTS SECTION */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="space-y-6 pt-4">

            {/* Chart Section Header with Metric Mode Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
              <div>
                <h3 className="text-xl font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-forest dark:text-[#FF7028]" />
                  <span>Physical Intake Distribution Analysis</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">
                  Explore material stream breakdown and intake logistics channels based on genuine receipts.
                </p>
              </div>

              {impactStats.hasReceivedData && (
                <div className="inline-flex rounded-lg border border-gray-200 dark:border-[#3A3E43] p-0.5 bg-gray-50 dark:bg-[#202326] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setMetricMode('weight')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      metricMode === 'weight'
                        ? 'bg-white dark:bg-[#292D31] text-forest dark:text-[#FF7028] shadow-xs'
                        : 'text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    By Weight (kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricMode('units')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      metricMode === 'units'
                        ? 'bg-white dark:bg-[#292D31] text-forest dark:text-[#FF7028] shadow-xs'
                        : 'text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    By Units (count)
                  </button>
                </div>
              )}
            </div>

            {/* Render Doughnut Charts OR Graceful Empty State */}
            {!impactStats.hasReceivedData ? (
              <div className="bg-sage-100/50 dark:bg-[#292D31] border border-sage-200 dark:border-[#3A3E43] rounded-2xl p-10 text-center max-w-2xl mx-auto space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center mx-auto">
                  <Leaf className="w-7 h-7 text-forest-700 dark:text-[#FF7028]" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                    Our environmental impact grows with every responsible e-waste contribution.
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-[#B8BDC3] max-w-md mx-auto leading-relaxed">
                    Category insights will appear as e-waste is received. We maintain strict data integrity: totals reflect strictly confirmed, physically received hardware declarations.
                  </p>
                </div>
                <div className="pt-2">
                  {isCentreAuthenticated ? (
                    <Link
                      to="/centre/requests"
                      className="btn-primary text-xs px-6 py-2.5 font-semibold shadow-xs inline-flex items-center gap-2"
                    >
                      <span>Review Intake Queue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      to="/register"
                      className="btn-primary text-xs px-6 py-2.5 font-semibold shadow-xs inline-flex items-center gap-2"
                    >
                      <span>Register Surplus Hardware</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart 1: E-Waste Category Distribution */}
                <DoughnutChart
                  data={categoryChartData}
                  total={chartTotal}
                  unit={chartUnit}
                  title="E-Waste Category Stream Intake"
                  emptyMessage="Category insights will appear as e-waste is received."
                  centerLabel="Total Received"
                />

                {/* Chart 2: Intake Logistics Method (Pickup vs Drop-off) */}
                <DoughnutChart
                  data={methodChartData}
                  total={chartTotal}
                  unit={chartUnit}
                  title="Intake Logistics Channel Distribution"
                  emptyMessage="Logistics insights will appear as e-waste is received."
                  centerLabel="Total Intake"
                />
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. WHY RESPONSIBLE E-WASTE DISPOSAL MATTERS */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="py-20 border-b border-gray-200 dark:border-[#3A3E43] bg-offwhite dark:bg-[#202326]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Story Column */}
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-bold text-forest dark:text-[#FF7028] uppercase tracking-wider">
                The Science of Electronics Recovery
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5] leading-tight">
                Electronics should never enter a municipal landfill.
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
                Printed circuit boards and microprocessors contain toxic heavy elements such as lead, cadmium, and mercury, alongside finite critical minerals including gold, palladium, and copper.
              </p>

              <div className="pt-2 space-y-4 text-sm text-gray-700 dark:text-[#B8BDC3]">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-forest-50 dark:bg-[#292D31] text-forest dark:text-[#FF7028] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-forest-700 dark:text-[#FF7028]" />
                  </div>
                  <div>
                    <strong className="text-charcoal dark:text-[#F5F5F5] block">Toxic Hazard Depollution</strong>
                    <span className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed block mt-0.5">
                      Prevents bioaccumulative heavy metals and brominated flame retardants from leaching into local groundwater aquifers and soil microbiomes.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-forest-50 dark:bg-[#292D31] text-forest dark:text-[#FF7028] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-forest-700 dark:text-[#FF7028]" />
                  </div>
                  <div>
                    <strong className="text-charcoal dark:text-[#F5F5F5] block">High-Efficiency Urban Mining</strong>
                    <span className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed block mt-0.5">
                      Extracting materials from 1 metric ton of circuit boards yields up to 50 times more gold and copper than extracting 1 ton of primary ore.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-forest-50 dark:bg-[#292D31] text-forest dark:text-[#FF7028] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-forest-700 dark:text-[#FF7028]" />
                  </div>
                  <div>
                    <strong className="text-charcoal dark:text-[#F5F5F5] block">Immutable Chain-of-Custody</strong>
                    <span className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed block mt-0.5">
                      Direct handoffs eliminate informal open-air incineration and illegal offshore waste trafficking.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Comparison Card */}
            <div className="lg:col-span-6 bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="pb-3 border-b border-gray-100 dark:border-[#3A3E43] flex items-center justify-between">
                <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                  <span>The Material Lifecycle Comparison</span>
                </h3>
                <span className="text-[11px] font-semibold text-gray-500 dark:text-[#B8BDC3] uppercase tracking-wider">
                  Circular vs Linear
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Linear Dumping (Preserved semantic red status) */}
                <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-950 dark:text-red-200 space-y-2">
                  <span className="font-bold text-red-700 dark:text-red-400 block">Linear Landfill Pathway</span>
                  <ul className="space-y-1.5 text-[11px] list-disc list-inside text-red-800 dark:text-red-300 leading-relaxed">
                    <li>Toxic leachate pollutes municipal soil</li>
                    <li>Irreversible loss of rare earth elements</li>
                    <li>Extensive carbon emissions from new virgin ore mining</li>
                    <li>Informal, hazardous open-air burning risks</li>
                  </ul>
                </div>

                {/* EcoCycle Recovery (Preserved semantic emerald status) */}
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-200 space-y-2">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block">EcoCycle Circular Recovery</span>
                  <ul className="space-y-1.5 text-[11px] list-disc list-inside text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    <li>Certified sorting and mechanical disassembly</li>
                    <li>Up to 98% metallic raw mineral reclamation</li>
                    <li>Zero-landfill depollution protocol</li>
                    <li>Recorded custody compliance manifest</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Link
                  to="/about"
                  className="text-xs font-semibold text-forest dark:text-[#FF7028] hover:text-forest-900 dark:hover:text-[#F45D16] inline-flex items-center gap-1.5"
                >
                  <span>Learn more about our verified environmental protocols</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. SIMPLE 3-STEP CUSTOMER JOURNEY */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 border-b border-sage-200/80 dark:border-[#3A3E43] bg-sage-100/60 dark:bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-forest dark:text-[#FF7028] uppercase tracking-wider">
              Simple 3-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
              How You Can Contribute
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-[#B8BDC3]">
              Three straightforward steps to route electronic surplus into certified recovery channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xs hover:border-forest-200 dark:hover:border-[#FF7028]/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028] shadow-2xs">
                      <Icon className="w-5 h-5 text-forest-700 dark:text-[#FF7028]" />
                    </div>
                    <span className="text-xs font-mono font-bold text-gray-400 dark:text-[#B8BDC3]">
                      {step.number}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-forest dark:text-[#FF7028] hover:text-forest-900 dark:hover:text-[#F45D16] transition-colors group"
            >
              <span>Explore technical custody transitions and certified protocols</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 6. OUR RECYCLING NETWORK (Public Centres Directory Integration) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="py-20 border-b border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#202326]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-forest dark:text-[#FF7028] uppercase tracking-wider">
              Regional Certified Depots
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
              Our Certified Recycling Network
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              EcoCycle partners with authorized recycling facilities vetted for throughput capacity, hazard depollution, and circular material recovery.
            </p>
          </div>

          {/* Network Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.title}
                  className="bg-offwhite dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-6 space-y-3 shadow-2xs hover:border-gray-300 dark:hover:border-[#FF7028]/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-forest-700 dark:text-[#FF7028]" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Prominent Call to Action to Browse Public Centres Directory */}
          <div className="bg-gradient-to-r from-forest-50 via-sage-50 to-forest-50 dark:from-[#292D31] dark:via-[#202326] dark:to-[#292D31] border border-forest-100 dark:border-[#3A3E43] rounded-2xl p-8 sm:p-10 text-center space-y-4 max-w-3xl mx-auto shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-forest dark:bg-[#FF7028] text-white flex items-center justify-center mx-auto shadow-xs">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-charcoal dark:text-[#F5F5F5]">
                Browse Registered Recycling Facilities
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-[#B8BDC3] max-w-md mx-auto leading-relaxed">
                Discover active facilities in your area, view accepted e-waste streams, inspect operating hours, and check drop-off or doorstep pickup availability without requiring login.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/centers"
                onClick={(e) => {
                  e.preventDefault();
                  openDirectory('Home Overview');
                }}
                className="btn-primary text-xs sm:text-sm px-6 py-2.5 font-semibold shadow-xs inline-flex items-center gap-2"
              >
                <span>Browse Centres Directory</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/accepted-waste"
                className="btn-secondary text-xs sm:text-sm px-5 py-2.5 font-semibold"
              >
                Accepted Criteria
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 7. JOIN THE EFFORT (Final Motivational Call to Action) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-sage-100/60 dark:bg-[#0A0A0A] border-b border-sage-200/80 dark:border-[#3A3E43]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] flex items-center justify-center mx-auto shadow-2xs">
            <Leaf className="w-6 h-6 text-forest-700 dark:text-[#FF7028]" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold text-charcoal dark:text-[#F5F5F5] tracking-tight">
              {isCentreAuthenticated
                ? 'Ready to process incoming electronic waste dispatches?'
                : 'Ready to divert unwanted electronics from landfills?'}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-[#B8BDC3] max-w-xl mx-auto leading-relaxed">
              {isCentreAuthenticated
                ? 'Review incoming manifests, inspect customer drop-offs and courier pickups, and maintain permanent recycling chain of custody.'
                : 'Every small action contributes to lasting environmental impact. Register your surplus items today or explore certified collection depots.'}
            </p>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isCentreAuthenticated ? (
              <>
                <Link
                  to="/centre/requests"
                  className="btn-primary text-sm px-8 py-3.5 shadow-md font-semibold inline-flex items-center gap-2"
                >
                  <span>Review Facility Manifests</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/centre/dashboard"
                  className="btn-secondary text-sm px-7 py-3.5 font-semibold"
                >
                  Facility Operations Dashboard
                </Link>
              </>
            ) : isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="btn-primary text-sm px-8 py-3.5 shadow-md font-semibold inline-flex items-center gap-2"
                >
                  <span>Register E-Waste</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/requests"
                  className="btn-secondary text-sm px-7 py-3.5 font-semibold"
                >
                  View My Requests
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="btn-primary text-sm px-8 py-3.5 shadow-md font-semibold inline-flex items-center gap-2"
                >
                  <span>Register E-Waste</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/centers"
                  onClick={(e) => {
                    e.preventDefault();
                    openDirectory('Home Overview');
                  }}
                  className="btn-secondary text-sm px-7 py-3.5 font-semibold"
                >
                  Browse Centres Directory
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
