import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Target, Users, ArrowRight, Leaf, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  const pillars = [
    {
      title: 'Zero Landfill Commitment',
      description: 'Every registered unit is channeled exclusively to R2/e-Stewards compliant facilities ensuring 0% toxic landfill dumping.',
      icon: Leaf,
    },
    {
      title: 'Certified Chain-of-Custody',
      description: 'Transparent audit logs allow individuals and institutions to verify that their equipment was safely depolluted and recycled.',
      icon: Shield,
    },
    {
      title: 'Circular Resource Recovery',
      description: 'Maximizing the recovery rate of critical minerals (copper, gold, cobalt, lithium) to displace energy-intensive virgin mining.',
      icon: Target,
    },
    {
      title: 'Academic & Civic Impact',
      description: 'Empowering campus communities and citizens to adopt accountable electronic lifecycle stewardship.',
      icon: Users,
    },
  ];

  return (
    <div className="bg-offwhite text-charcoal dark:bg-[#0A0A0A] dark:text-[#F5F5F5] page-enter">

      {/* 1. Hero Header (White with subtle dot pattern) */}
      <div className="bg-white dark:bg-[#101010] border-b border-gray-200 dark:border-[#3A3E43] bg-dot-pattern py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="text-xs font-semibold text-forest dark:text-[#FF7028] uppercase tracking-wider">
            About Our Mission
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
            Building a responsible electronic lifecycle for everyone.
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-[#B8BDC3] max-w-2xl mx-auto leading-relaxed">
            EcoCycle is an E-Waste Management &amp; Recycling Optimization System designed to bridge the gap between electronics consumers and certified recycling infrastructure.
          </p>
        </div>
      </div>

      {/* 2. Challenge Narrative (Pale-Sage Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-sage-100/60 dark:bg-[#202326] border-b border-sage-200/80 dark:border-[#3A3E43]">
        <div className="max-w-4xl mx-auto bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-8 sm:p-10 space-y-6 shadow-xs">
          <h2 className="text-xl font-bold text-charcoal dark:text-[#F5F5F5] pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
            The Electronic Waste Challenge
          </h2>
          <div className="space-y-4 text-sm text-gray-700 dark:text-[#B8BDC3] leading-relaxed">
            <p>
              Electronic waste is currently the fastest-growing solid waste stream on the planet. While electronic devices represent less than 3% of global waste mass, they are responsible for over 70% of heavy metals (such as lead, mercury, and cadmium) found in municipal landfills.
            </p>
            <p>
              At the same time, printed circuit boards contain concentrations of gold, silver, and copper up to 40 times higher than natural ores. Dumping or burning electronics informally damages public health and wastes invaluable finite materials.
            </p>
            <p>
              EcoCycle was engineered as a comprehensive platform to coordinate e-waste declarations, connect verified regional collection centers, and provide transparent tracking for every participant.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Core Pillars (White Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0A0A0A] border-b border-gray-200 dark:border-[#3A3E43]">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-2xl font-bold text-charcoal dark:text-[#F5F5F5]">
              Core Principles &amp; Objectives
            </h2>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3]">
              Guiding the operational design of our optimization platform
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-xl p-6 space-y-3 card-hover shadow-xs"
                >
                  <div className="w-10 h-10 rounded-lg bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-forest-700 dark:text-[#FF7028]" />
                  </div>
                  <h3 className="text-base font-semibold text-charcoal dark:text-[#F5F5F5]">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Academic Context Banner (Pale-Sage Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-sage-100/50 dark:bg-[#202326]">
        <div className="max-w-4xl mx-auto bg-white dark:bg-[#292D31] border border-sage-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-semibold text-forest dark:text-[#FF7028] uppercase tracking-wider">
              Project Context
            </span>
            <h3 className="text-lg font-bold text-charcoal dark:text-[#F5F5F5]">
              Academic Capstone Development
            </h3>
            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] max-w-md">
              Developed as a collegiate software engineering initiative focusing on sustainability tech, user experience, and environmental operations.
            </p>
          </div>
          <Link
            to="/contact"
            className="btn-primary text-xs px-5 py-2.5 font-semibold shrink-0"
          >
            Get in touch
          </Link>
        </div>
      </div>

    </div>
  );
}
