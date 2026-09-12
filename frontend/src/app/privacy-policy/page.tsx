'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, Mail, Lock, FileText, Server, Eye } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
        {/* HEADER SECTION */}
        <section className="space-y-4">
          <Badge variant="primary" size="md" className="gap-1.5 px-3 py-1 font-semibold uppercase tracking-wider text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Privacy & Data Security
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Last updated: September 11, 2026 • Effective immediately
          </p>
        </section>

        {/* POLICY CONTENT CARDS */}
        <div className="space-y-8 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
          {/* INTRODUCTION */}
          <Card className="p-6 md:p-8 space-y-4">
            <p>
              At <strong>Hirely</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), we prioritize the trust, security, and privacy of our candidates and employer partners. This Privacy Policy details how we collect, process, store, and protect your information when you interact with our platform, website, and services.
            </p>
            <p>
              By accessing or using Hirely, you agree to the collection and use of your information in accordance with this policy.
            </p>
          </Card>

          {/* 1. DATA WE COLLECT */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-zinc-500" />
              1. Information We Collect
            </h2>
            <Card className="p-6 space-y-4">
              <p>We collect several types of information to provide, maintain, and optimize our services:</p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <strong>Account & Registration Details:</strong> Full name, email address, phone number, password hashes, and profile avatars.
                </li>
                <li>
                  <strong>Resume & Professional Profile Data:</strong> Work history, education records, skill sets, certifications, portfolio links, uploaded resume files, and preferred job locations.
                </li>
                <li>
                  <strong>Application History & Communications:</strong> Records of job applications submitted, saved job positions, messages exchanged with employers or admins, and support ticket submissions.
                </li>
                <li>
                  <strong>Usage & Technical Data:</strong> Browser type, operating system version, access timestamps, page interactions, and IP addresses collected for platform security and audit logging.
                </li>
              </ul>
            </Card>
          </section>

          {/* 2. HOW WE USE YOUR DATA */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Eye className="w-5 h-5 text-zinc-500" />
              2. How Your Information Is Used
            </h2>
            <Card className="p-6 space-y-4">
              <p>We process your personal information strictly for legitimate operational purposes:</p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <strong>AI Job Matching & Recommendations:</strong> Algorithmically matching candidate profiles against employer job requisitions based on verified skills and experience.
                </li>
                <li>
                  <strong>Platform Functionality:</strong> Facilitating candidate applications, employer listing management, skill test scoring, and real-time messaging.
                </li>
                <li>
                  <strong>Security & Fraud Prevention:</strong> Detecting suspicious login activity, preventing unauthorized web scraping, verifying employer legitimacy, and maintaining system integrity.
                </li>
                <li>
                  <strong>Platform Communications:</strong> Sending notifications regarding application updates, interview requests, support replies, and critical account security alerts.
                </li>
              </ul>
            </Card>
          </section>

          {/* 3. DATA PROTECTION & SECURITY MEASURES */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-zinc-500" />
              3. Data Protection & Security Architecture
            </h2>
            <Card className="p-6 space-y-4">
              <p>
                We implement industry-standard technical and organizational safeguards to ensure your data remains protected against unauthorized access, loss, or disclosure:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <strong>Secure Session Management:</strong> Authentication tokens are stored in secure, encrypted <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">httpOnly</code> cookies to mitigate cross-site scripting (XSS) risks.
                </li>
                <li>
                  <strong>Password Encryption:</strong> Passwords are salt-hashed using salted bcrypt algorithms prior to database storage.
                </li>
                <li>
                  <strong>No Data Selling:</strong> We do <strong>NOT</strong> sell, rent, or trade personal profile data or resume information to third-party data brokers or marketing firms under any circumstances.
                </li>
              </ul>
            </Card>
          </section>

          {/* 4. THIRD-PARTY SERVICES */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Server className="w-5 h-5 text-zinc-500" />
              4. Third-Party Infrastructure Providers
            </h2>
            <Card className="p-6 space-y-4">
              <p>
                To provide seamless platform functionality, we partner with trusted, secure cloud service providers:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <strong>Cloud File Storage (Cloudinary):</strong> Used for secure storage and delivery of candidate resume files, verification documents, and profile avatars.
                </li>
                <li>
                  <strong>AI Intelligence Providers:</strong> We use specialized AI service providers (such as Groq) to power intelligence features including resume quality checks, AI screening answer drafting, and mock interview coaching. Data processed by AI features is transmitted securely over HTTPS and used solely to fulfill your requested feature.
                </li>
              </ul>
            </Card>
          </section>

          {/* 5. DATA RETENTION & USER RIGHTS */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-zinc-500" />
              5. Data Retention & Your Rights
            </h2>
            <Card className="p-6 space-y-4">
              <p>
                You retain complete ownership of your personal data. Under applicable privacy regulations, you have the following rights:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li><strong>Right of Access & Portability:</strong> View and retrieve your personal profile details, resume files, and application records.</li>
                <li><strong>Right of Correction:</strong> Update or rectify incomplete or inaccurate information at any time via your account settings.</li>
                <li><strong>Right of Erasure (Deletion):</strong> Request permanent deletion of your Hirely account and associated data records.</li>
              </ul>
              <p className="text-xs text-zinc-500">
                Data is retained for as long as your account remains active or as needed to comply with legal obligations and resolve platform disputes.
              </p>
            </Card>
          </section>

          {/* 6. CONTACT US */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Mail className="w-5 h-5 text-zinc-500" />
              6. Contacting Us About Privacy Concerns
            </h2>
            <Card className="p-6 space-y-3">
              <p>
                If you have questions, feedback, or privacy concerns regarding this policy or wish to exercise your data rights, please contact our data protection team:
              </p>
              <div className="pt-2">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-extrabold text-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Submit Privacy Inquiry on Contact Page
                </Link>
              </div>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
