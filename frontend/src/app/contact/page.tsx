'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SelectDropdown } from '@/components/ui/SelectDropdown';
import { Mail, MessageSquare, CheckCircle2, AlertCircle, Send, HelpCircle, ShieldCheck } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'general_inquiry', label: 'General Inquiry' },
  { value: 'technical_support', label: 'Technical Support' },
  { value: 'account_issue', label: 'Account Issue' },
  { value: 'billing_question', label: 'Billing Question' },
  { value: 'report_problem', label: 'Report a Problem' },
  { value: 'business_inquiry', label: 'Business Inquiry' },
  { value: 'other', label: 'Other' },
];

export default function ContactPage() {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general_inquiry');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-fill name & email if user is logged in
  useEffect(() => {
    if (user) {
      if (user.fullName) setName(user.fullName);
      if (user.email) setEmail(user.email);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !message.trim()) {
      setErrorMessage('Please provide both your email address and message.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedCategoryObj = CATEGORY_OPTIONS.find((c) => c.value === category);
      const categoryLabel = selectedCategoryObj ? selectedCategoryObj.label : 'General';
      const finalSubject = subject.trim() || `${categoryLabel} Inquiry`;

      const res = await api.post('/support/ticket', {
        name: name.trim() || undefined,
        email: email.trim(),
        category,
        subject: finalSubject,
        message: message.trim(),
      });

      if (res.data?.success) {
        setSubmitSuccess(true);
        setMessage('');
        if (!user) {
          setName('');
          setEmail('');
        }
        setSubject('');
      } else {
        setErrorMessage(res.data?.message || 'Failed to submit inquiry. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'An error occurred while submitting your ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
        {/* HEADER SECTION */}
        <section className="text-center space-y-4 max-w-2xl mx-auto">
          <Badge variant="primary" size="md" className="gap-1.5 px-3 py-1 font-semibold uppercase tracking-wider text-[11px]">
            <HelpCircle className="w-3.5 h-3.5" />
            We&apos;re Here to Help
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            Contact Support & Enquiries
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
            Have a question about Hirely, need technical assistance, or want to report an issue? Send us a message and our support team will respond promptly.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* LEFT: ALTERNATIVE CONTACT & INFO BOX */}
          <div className="md:col-span-1 space-y-6">
            <Card className="p-6 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Alternative Contact Method
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Prefer sending a direct email? Reach out directly to our official support address:
                </p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs font-mono text-zinc-900 dark:text-zinc-100 font-semibold break-all border border-zinc-200 dark:border-zinc-700">
                support@hirely.com
              </div>
              <p className="text-[11px] text-zinc-400 italic">
                Note: Email domain should be updated to real production domain prior to official launch.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Ticket Resolution Guarantee</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                All submitted tickets are logged in our Admin Core system for trackable response times and direct email replies.
              </p>
            </Card>
          </div>

          {/* RIGHT: CONTACT FORM OR SUCCESS CONFIRMATION */}
          <div className="md:col-span-2">
            <Card className="p-6 sm:p-8">
              {submitSuccess ? (
                <div className="text-center py-8 space-y-6 animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                      Support Ticket Received!
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                      Thank you for contacting Hirely. Your support ticket has been registered in our admin queue. Our support team will review your inquiry and reply to <strong>{email}</strong> shortly.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSubmitSuccess(false)}
                      className="text-xs font-bold px-6 rounded-xl"
                    >
                      Submit Another Message
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-zinc-500" />
                      Send Us a Message
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Fill out the form below to open a trackable support ticket.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-3 text-xs text-red-700 dark:text-red-300">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* NAME */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                      />
                    </div>

                    {/* EMAIL */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* CATEGORY DROPDOWN */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Inquiry Category <span className="text-red-500">*</span>
                      </label>
                      <SelectDropdown
                        value={category}
                        onChange={(val) => setCategory(val)}
                        options={CATEGORY_OPTIONS}
                        placeholder="Select category"
                      />
                    </div>

                    {/* SUBJECT */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief summary of your inquiry..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                      />
                    </div>
                  </div>

                  {/* MESSAGE TEXTAREA */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Message Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe your question, technical issue, or inquiry in detail..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all resize-y"
                    />
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={isSubmitting}
                      className="w-full sm:w-auto font-bold px-8 rounded-xl"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit Support Ticket
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
