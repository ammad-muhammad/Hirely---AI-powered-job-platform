'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FileText, ShieldAlert, CheckCircle2, Scale, CreditCard, AlertTriangle, Building2 } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
        {/* HEADER SECTION */}
        <section className="space-y-4">
          <Badge variant="primary" size="md" className="gap-1.5 px-3 py-1 font-semibold uppercase tracking-wider text-[11px]">
            <Scale className="w-3.5 h-3.5" />
            Legal Agreement
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Last updated: September 11, 2026 • Please read carefully before using Hirely
          </p>
        </section>

        {/* POLICY CONTENT CARDS */}
        <div className="space-y-8 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
          {/* 1. ACCEPTANCE OF TERMS */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-zinc-500" />
              1. Acceptance of Terms
            </h2>
            <Card className="p-6 space-y-3">
              <p>
                These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User,&quot; &quot;Candidate,&quot; or &quot;Employer&quot;) and <strong>Hirely Platform</strong> (&quot;Hirely,&quot; &quot;we,&quot; or &quot;us&quot;).
              </p>
              <p>
                By creating an account, browsing job listings, posting requisitions, or using any feature provided by Hirely, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these terms, you must refrain from accessing or using the platform.
              </p>
            </Card>
          </section>

          {/* 2. ACCOUNT RESPONSIBILITIES */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-zinc-500" />
              2. Account Registration & User Responsibilities
            </h2>
            <Card className="p-6 space-y-4">
              <p>To access core platform features, you must create a verified account:</p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li><strong>Accurate Information:</strong> You agree to provide truthful, accurate, and current information in your user profile, resume, work history, and corporate entity verification documents.</li>
                <li><strong>One Account Per Person:</strong> Users may maintain only one active individual candidate account or authorized corporate account. Account sharing or credential transfer is strictly prohibited.</li>
                <li><strong>Credential Security:</strong> You are solely responsible for safeguarding your login credentials. You must notify Hirely support immediately of any unauthorized account access.</li>
              </ul>
            </Card>
          </section>

          {/* 3. ACCEPTABLE USE & SUSPENSION SYSTEM */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-zinc-500" />
              3. Acceptable Use & Account Enforcement System
            </h2>
            <Card className="p-6 space-y-4">
              <p>Hirely maintains strict operational standards to protect all platform users. The following activities are expressly prohibited:</p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li><strong>Fake or Fraudulent Listings:</strong> Posting fictitious job requisitions, misrepresenting employer identity, or soliciting advance payment/fees from candidates.</li>
                <li><strong>Harassment & Misconduct:</strong> Transmitting abusive, discriminatory, harassing, or deceptive content through platform messaging or application channels.</li>
                <li><strong>Web Scraping & Automated Data Extraction:</strong> Utilizing automated scripts, bots, scrapers, or unauthorized indexing software to harvest profiles or job listings.</li>
              </ul>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2 text-xs text-amber-900 dark:text-amber-300">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Enforcement & Warning System</span>
                </div>
                <p>
                  Violations of acceptable use policies trigger our administrative enforcement system. Depending on severity, actions include official warnings, job listing deletion, employer badge revocation, or immediate account suspension.
                </p>
              </div>
            </Card>
          </section>

          {/* 4. JOB SEEKER & EMPLOYER TERMS */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-zinc-500" />
              4. Job Seeker & Employer Specific Terms
            </h2>
            <Card className="p-6 space-y-4">
              <p><strong>Job Seekers:</strong> Submitting an application constitutes consent to share your resume and profile details with the specified employer. Hirely does not guarantee job placement, interview calls, or employment offers.</p>
              <p><strong>Employers:</strong> Employers are responsible for the legality, accuracy, and content of their posted jobs. Employers must comply with local labor laws and respect candidate data privacy. Hirely does not guarantee candidate quality, performance, or minimum applicant volume.</p>
            </Card>
          </section>

          {/* 5. SUBSCRIPTIONS & BILLING TERMS */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-zinc-500" />
              5. Subscriptions, Featured Listings & Billing Terms
            </h2>
            <Card className="p-6 space-y-4">
              <p>
                Hirely offers premium tier upgrades for employers, including <strong>Pro Tier Subscriptions</strong> and <strong>Featured Job Listing Boosts</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li><strong>Billing & Charges:</strong> Subscriptions and featured job listings are billed according to stated prices at the time of purchase. Charges are processed in advance.</li>
                <li><strong>Refund Policy:</strong> Subscription fees and featured job listing credits are non-refundable except where required by law or specified by official administrative approval.</li>
                <li><strong>Plan Tier Adjustments:</strong> Hirely reserves the right to modify subscription features or tier pricing with prior notice.</li>
              </ul>
            </Card>
          </section>

          {/* 6. INTELLECTUAL PROPERTY & LIABILITY */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Scale className="w-5 h-5 text-zinc-500" />
              6. Intellectual Property & Limitation of Liability
            </h2>
            <Card className="p-6 space-y-4">
              <p>
                All platform software, algorithms, trademarks, UI designs, and logos are the exclusive property of Hirely. Users retain ownership of their submitted resume assets and corporate logos.
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                To the maximum extent permitted by law, Hirely shall not be liable for indirect, incidental, special, or consequential damages resulting from platform downtime, lost job opportunities, or hiring decisions.
              </p>
            </Card>
          </section>

          {/* 7. TERMINATION & GOVERNING LAW */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Scale className="w-5 h-5 text-zinc-500" />
              7. Termination & Governing Law
            </h2>
            <Card className="p-6 space-y-4">
              <p>
                Hirely reserves the right to suspend or terminate user access at any time for policy breaches. You may terminate your account at any time via settings or by contacting support.
              </p>
              <p>
                These Terms are governed by and construed in accordance with the laws of the <strong>Islamic Republic of Pakistan</strong>. Any legal disputes arising out of these Terms shall be subject to the jurisdiction of Pakistani courts.
              </p>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
