import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-offwhite text-charcoal page-enter">

      {/* 1. Header (White with subtle dot pattern) */}
      <div className="bg-white border-b border-gray-200 bg-dot-pattern py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="text-xs font-semibold text-forest uppercase tracking-wider">
            Get in Touch
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal">
            Contact EcoCycle Support
          </h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xl mx-auto">
            Have questions regarding e-waste procedures, partnership inquiries, or project technical design? We are here to help.
          </p>
        </div>
      </div>

      {/* 2. Contact Grid (Pale-Sage Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-sage-100/60 border-b border-sage-200/80">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

            {/* Left Column: Contact Details (5 Cols) */}
            <div className="md:col-span-5 space-y-6">
              <div className="bg-white border border-gray-200/90 rounded-xl p-6 space-y-4 shadow-xs card-hover">
                <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal pb-2 border-b border-gray-100">
                  Project Headquarters
                </h3>

                <div className="space-y-3.5 text-xs text-gray-700">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-forest mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-charcoal block">Department of Computer Science</span>
                      <span>College Engineering Campus, Lab 302</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-forest mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-charcoal block">Project Inquiries</span>
                      <span>support@ecocycle-project.edu</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-forest mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-charcoal block">Lab Support Desk</span>
                      <span>+1 (555) 438-9278</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-sage-200 rounded-xl p-5 text-xs text-forest-900 space-y-1 shadow-xs">
                <span className="font-bold block text-forest">Academic Demonstration Notice</span>
                <p className="text-gray-600 leading-relaxed">
                  EcoCycle is an active collegiate milestone prototype. Inquiries submitted via this form are recorded for interface validation.
                </p>
              </div>
            </div>

            {/* Right Column: Contact Form (7 Cols) */}
            <div className="md:col-span-7 bg-white border border-gray-200/90 rounded-xl p-6 sm:p-8 shadow-xs card-hover">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-charcoal">
                    Message Transmitted
                  </h3>
                  <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                    Thank you for your inquiry, <strong>{form.name}</strong>. Your message has been logged in prototype state.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: '', email: '', subject: 'general', message: '' });
                    }}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@university.edu"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Inquiry Subject
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
                    >
                      <option value="general">General E-Waste Question</option>
                      <option value="center">Collection Center Verification</option>
                      <option value="pickup">Bulk Campus / Office Pickup</option>
                      <option value="technical">Project Technical Architecture</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Message *
                    </label>
                    <textarea
                      required
                      rows="4"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Describe your inquiry or equipment questions..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full text-sm py-2.5 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
