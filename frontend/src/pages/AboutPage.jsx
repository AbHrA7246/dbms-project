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
    <div className="bg-offwhite text-charcoal page-enter">

      {/* 1. Hero Header (White with subtle dot pattern) */}
      <div className="bg-white border-b border-gray-200 bg-dot-pattern py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="text-xs font-semibold text-forest uppercase tracking-wider">
            About Our Mission
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-charcoal">
            Building a responsible electronic lifecycle for everyone.
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            EcoCycle is an E-Waste Management &amp; Recycling Optimization System designed to bridge the gap between electronics consumers and certified recycling infrastructure.
          </p>
        </div>
      </div>

      {/* 2. Challenge Narrative (Pale-Sage Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-sage-100/60 border-b border-sage-200/80">
        <div className="max-w-4xl mx-auto bg-white border border-gray-200/90 rounded-2xl p-8 sm:p-10 space-y-6 shadow-xs">
          <h2 className="text-xl font-bold text-charcoal pb-2 border-b border-gray-100">
            The Electronic Waste Challenge
          </h2>
          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <p>
              Electronic waste is currently the fastest-growing solid waste stream on the planet. While electronic devices represent less than 3% of global waste mass, they are responsible for over 70% of heavy metals (such as lead, mercury, and cadmium) found in municipal landfills.
            </p>
            <p>
              At the same time, printed circuit boards contain concentrations of gold, silver, and copper up to 40 times higher than natural ores. Dumping or burning electronics informally damages public health and wastes invaluable finite materials.
            </p>
            <p>
              EcoCycle was conceived as an academic college project to engineer a clean, accessible web application that coordinates e-waste declarations, connects verified regional collection centers, and provides transparent tracking for every participant.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Core Pillars (White Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-2xl font-bold text-charcoal">
              Core Principles &amp; Objectives
            </h2>
            <p className="text-xs text-gray-500">
              Guiding the operational design of our optimization platform
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="bg-white border border-gray-200/90 rounded-xl p-6 space-y-3 card-hover shadow-xs"
                >
                  <div className="w-10 h-10 rounded-lg bg-forest-50 text-forest flex items-center justify-center">
                    <Icon className="w-5 h-5 text-forest-700" />
                  </div>
                  <h3 className="text-base font-semibold text-charcoal">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Academic Context Banner (Pale-Sage Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-sage-100/50">
        <div className="max-w-4xl mx-auto bg-white border border-sage-200 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-semibold text-forest uppercase tracking-wider">
              Project Context
            </span>
            <h3 className="text-lg font-bold text-charcoal">
              Academic Capstone Development
            </h3>
            <p className="text-xs text-gray-600 max-w-md">
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
