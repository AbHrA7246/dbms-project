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
    <div className="bg-offwhite text-charcoal dark:bg-[#0A0A0A] dark:text-[#F5F5F5] page-enter">

      {/* 1. Header (White with subtle dot pattern) */}
      <div className="bg-white dark:bg-[#101010] border-b border-gray-200 dark:border-[#3A3E43] bg-dot-pattern py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="text-xs font-semibold text-forest dark:text-[#FF7028] uppercase tracking-wider">
            Get in Touch
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
            Contact EcoCycle Support
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-[#B8BDC3] leading-relaxed max-w-xl mx-auto">
            Have questions regarding e-waste procedures, partnership inquiries, or project technical design? We are here to help.
          </p>
        </div>
      </div>

      {/* 2. Contact Grid (Pale-Sage Background) */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-sage-100/60 dark:bg-[#202326] border-b border-sage-200/80 dark:border-[#3A3E43]">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

            {/* Left Column: Contact Details (5 Cols) */}
            <div className="md:col-span-5 space-y-6">
              <div className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-xl p-6 space-y-4 shadow-xs card-hover">
                <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5] pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
                  Project Headquarters
                </h3>

                <div className="space-y-3.5 text-xs text-gray-700 dark:text-[#B8BDC3]">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-forest dark:text-[#FF7028] mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-charcoal dark:text-[#F5F5F5] block">Department of Computer Science</span>
                      <span className="text-gray-600 dark:text-[#B8BDC3]">College Engineering Campus, Lab 302</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-forest dark:text-[#FF7028] mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-charcoal dark:text-[#F5F5F5] block">Project Inquiries</span>
                      <span className="text-gray-600 dark:text-[#B8BDC3]">support@ecocycle-project.edu</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-forest dark:text-[#FF7028] mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-charcoal dark:text-[#F5F5F5] block">Lab Support Desk</span>
                      <span className="text-gray-600 dark:text-[#B8BDC3]">+1 (555) 438-9278</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form (7 Cols) */}
            <div className="md:col-span-7 bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 shadow-xs card-hover">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-charcoal dark:text-[#F5F5F5]">
                    Message Transmitted
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-[#B8BDC3] max-w-sm mx-auto leading-relaxed">
                    Thank you for your inquiry, <strong>{form.name}</strong>. Your message has been received and our team will respond promptly.
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
                    <label className="block text-xs font-medium text-gray-700 dark:text-[#B8BDC3] mb-1">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FF7028] focus:border-[#FF7028]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-[#B8BDC3] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@university.edu"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FF7028] focus:border-[#FF7028]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-[#B8BDC3] mb-1">
                      Inquiry Subject
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-[#FF7028] focus:border-[#FF7028]"
                    >
                      <option value="general" className="dark:bg-[#202326]">General E-Waste Question</option>
                      <option value="center" className="dark:bg-[#202326]">Collection Center Verification</option>
                      <option value="pickup" className="dark:bg-[#202326]">Bulk Campus / Office Pickup</option>
                      <option value="technical" className="dark:bg-[#202326]">Project Technical Architecture</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-[#B8BDC3] mb-1">
                      Message *
                    </label>
                    <textarea
                      required
                      rows="4"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Describe your inquiry or equipment questions..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FF7028] focus:border-[#FF7028]"
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
