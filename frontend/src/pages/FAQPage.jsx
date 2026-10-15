import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      q: 'Does e-waste recycling cost anything for individuals and students?',
      a: 'Standard drop-offs at our verified partner collection centers are completely free for individual residents and students. Doorstep courier pickups for small items are also covered under municipal environmental stewardship programs. Bulk institutional dispatches may require prior scheduling.',
    },
    {
      q: 'How is confidential data on laptops and smartphones destroyed?',
      a: 'We strongly encourage all users to back up and factory-reset their devices before handoff. Once received at certified facilities, data-bearing media (HDDs, SSDs, memory cards) undergo software overwriting complying with NIST SP 800-88 / DoD standards, or physical degaussing and shredding.',
    },
    {
      q: 'What is the difference between drop-off and doorstep collection?',
      a: 'Drop-off allows you to deliver your hardware directly to an authorized recycling kiosk or facility during regular operating hours. Doorstep pickup connects you with verified logistics couriers who collect items from your residence or department at an agreed time slot.',
    },
    {
      q: 'What happens to materials recovered from recycled hardware?',
      a: 'Components suitable for reuse are refurbished or repurposed into tested replacement parts. Non-repairable items undergo multi-stage mechanical shredding and magnetic/optical separation to recover copper, aluminum, silver, gold, and recyclable plastics for closed-loop manufacturing.',
    },
    {
      q: 'Why must lithium-ion batteries never be thrown in municipal trash?',
      a: 'Lithium-ion batteries can easily rupture or short-circuit when compressed in garbage trucks or landfills, triggering intense thermal runaway fires that release toxic hydrogen fluoride fumes and contaminate surrounding refuse.',
    },
    {
      q: 'What certifications do your partner facilities hold?',
      a: 'Our network exclusively partners with facilities adhering to R2v3 (Responsible Recycling) or e-Stewards standards, as well as ISO 14001 environmental management protocols and state pollution control certifications.',
    },
    {
      q: 'How does request tracking and chain-of-custody work?',
      a: 'When you register an item, a unique tracking identifier (e.g. #EW-1042) is created. You can track this in your private portal through each stage: Submitted, Scheduled, In Transit, and Certified Recycled.',
    },
  ];

  return (
    <div className="bg-offwhite text-charcoal page-enter">

      {/* 1. Header with subtle dot pattern (White Background) */}
      <div className="bg-white border-b border-gray-200 bg-dot-pattern py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="text-xs font-semibold text-forest uppercase tracking-wider">
            Knowledge Base
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal">
            Frequently Asked Questions
          </h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xl mx-auto">
            Find answers regarding electronic drop-offs, data sanitation, material refining, and platform features.
          </p>
        </div>
      </div>

      {/* 2. Accordions (Pale-Sage Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-sage-100/60 border-b border-sage-200/80">
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-gray-200/90 rounded-xl overflow-hidden shadow-xs transition-all duration-200 card-hover"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                  className="w-full text-left px-6 py-4.5 flex items-center justify-between gap-4 focus:outline-none hover:bg-gray-50/70 transition-colors"
                >
                  <span className="text-sm sm:text-base font-semibold text-charcoal">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-forest' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Help Contact (White Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto bg-sage-100/50 border border-sage-200 rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest flex items-center justify-center mx-auto">
            <HelpCircle className="w-5 h-5 text-forest-700" />
          </div>
          <h3 className="text-base font-bold text-charcoal">
            Still have questions about e-waste disposal?
          </h3>
          <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
            Our academic project team is glad to provide more information on sustainable disposal protocols and system features.
          </p>
          <div className="pt-2">
            <Link
              to="/contact"
              className="btn-secondary text-xs px-5 py-2"
            >
              <span>Contact project support</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
