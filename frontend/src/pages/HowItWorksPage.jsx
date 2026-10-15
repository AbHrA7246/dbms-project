import React from 'react';
import { Link } from 'react-router-dom';
import {
  PackageCheck,
  Truck,
  ShieldCheck,
  Recycle,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function HowItWorksPage() {
  const workflowStages = [
    {
      step: '01',
      title: 'Digital Item Declaration',
      subtitle: 'Inventorying hardware and assessing condition',
      icon: PackageCheck,
      details: [
        'Select equipment category (computing, mobile, power storage, consumer gear).',
        'Record working condition to determine refurbishment vs. physical recycling routing.',
        'Automatic classification of hazardous elements (lithium batteries, CRTs, solder alloys).',
      ],
    },
    {
      step: '02',
      title: 'Collection & Verified Transport',
      subtitle: 'Drop-off kiosks or consolidated pickups',
      icon: Truck,
      details: [
        'Option A: Self drop-off at an accredited regional e-waste depot.',
        'Option B: On-demand scheduled pickup for heavier appliances or bulk equipment.',
        'Chain-of-custody tracking assigned immediately with a unique manifest ID.',
      ],
    },
    {
      step: '03',
      title: 'Diagnostic Triage & Depollution',
      subtitle: 'Hazardous isolation and components testing',
      icon: ShieldCheck,
      details: [
        'Manual dismantling by certified technicians in regulated clean facilities.',
        'Safe de-pollution: batteries, mercury lamps, and printed circuit boards are isolated.',
        'Working components are preserved for refurbishment; non-repairable units enter shredding.',
      ],
    },
    {
      step: '04',
      title: 'Material Recovery & Certification',
      subtitle: 'Closed-loop refining and compliance record',
      icon: Recycle,
      details: [
        'Pyrometallurgical and hydrometallurgical refining reclaims high-purity gold, copper, and cobalt.',
        'Non-metallic residues are neutralized and turned into engineered aggregates.',
        'An authenticated recycling certificate is issued confirming zero landfill diversion.',
      ],
    },
  ];

  return (
    <div className="bg-offwhite text-charcoal page-enter">

      {/* Header with subtle dot pattern and green tint */}
      <div className="bg-white border-b border-gray-200 bg-dot-pattern py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-forest-50 text-forest border border-forest-100 shadow-xs">
            <Recycle className="w-3.5 h-3.5 text-forest-700" />
            <span>Circular Recovery Pipeline</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-charcoal">
            The EcoCycle Recycling Workflow
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            From household declaration to certified material refining, discover how our optimization system ensures zero electronics enter landfills.
          </p>
        </div>
      </div>

      {/* Detailed Stages on Pale-Sage Background */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-sage-100/50 border-b border-sage-200/80">
        <div className="max-w-5xl mx-auto space-y-6">
          {workflowStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                className="bg-white border border-gray-200/90 rounded-xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start shadow-xs card-hover"
              >
                <div className="md:col-span-4 flex items-center md:items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-forest-50 border border-forest-100 text-forest flex items-center justify-center shrink-0 shadow-xs">
                    <Icon className="w-6 h-6 text-forest-700" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-gray-400 block">
                      STAGE {stage.step}
                    </span>
                    <h3 className="text-lg font-bold text-charcoal mt-0.5">
                      {stage.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {stage.subtitle}
                    </p>
                  </div>
                </div>

                <div className="md:col-span-8 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 space-y-2.5">
                  {stage.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-forest mt-0.5 shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Responsible Standard Card (White Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto bg-sage-100/60 border border-sage-200 rounded-2xl p-8 sm:p-10 text-center space-y-4 shadow-xs">
          <h2 className="text-2xl font-bold text-charcoal">
            Ready to participate in sustainable e-waste disposal?
          </h2>
          <p className="text-sm text-gray-600 max-w-xl mx-auto">
            Create an account or sign in to register your retired equipment, select verified facilities, and track disposal manifests.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="btn-primary text-sm px-6 py-2.5 shadow-sm"
            >
              <span>Create account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/accepted-waste"
              className="btn-secondary text-sm px-6 py-2.5"
            >
              Browse accepted categories
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
