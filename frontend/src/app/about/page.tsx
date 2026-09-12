'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/navigation/Header';
import { Footer } from '@/components/navigation/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Sparkles,
  ShieldCheck,
  Award,
  Bot,
  CheckCircle2,
  Users,
  Target,
  ArrowRight,
  Briefcase,
  Zap,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
      <Header />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-16">
        {/* HERO SECTION */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <Badge variant="primary" size="md" className="gap-1.5 px-3 py-1 font-semibold uppercase tracking-wider text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            Empowering Careers in Pakistan
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
            Building the Next Generation of Recruitment & Talent Acquisition
          </h1>
          <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
            Hirely is Pakistan&apos;s AI-powered job matching platform designed to seamlessly connect ambitious tech professionals and job seekers with verified employers, eliminating recruitment friction through intelligent automation and verified trust.
          </p>
        </section>

        {/* SECTION 1: OUR MISSION & PURPOSE */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                1. Our Mission — Fighting Scam Jobs & Friction
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Solving core recruitment challenges with transparent technology
              </p>
            </div>
          </div>

          <Card className="p-6 md:p-8 space-y-4 leading-relaxed text-sm text-zinc-600 dark:text-zinc-300">
            <p>
              Finding a job or hiring qualified candidates shouldn&apos;t feel like navigating a maze of unverified job boards, fake listings, or endless unacknowledged applications. In Pakistan&apos;s rapidly expanding tech ecosystem, traditional recruitment platforms are fraught with unverified company listings and low signal-to-noise ratios.
            </p>
            <p>
              At Hirely, our mission is to eliminate friction at every stage of the hiring lifecycle. We enforce strict employer verification to eradicate fraudulent job postings, empower job seekers with real-time feedback and AI guidance, and help companies hire with unmatched precision.
            </p>
          </Card>
        </section>

        {/* SECTION 2: WHAT MAKES HIRELY DIFFERENT */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                2. Core Innovations — Built into Hirely
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cutting-edge tools designed to evaluate and match genuine talent
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                AI Resume Analysis & Matching
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Our proprietary AI scanning engine evaluates candidates against exact job requirements, analyzing skills, project experience, and qualifications to yield precise match scores above 80%.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Skill Verification Badges
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Candidates complete timed technical assessments to earn verified skill badges. Employers can instantly filter for pre-verified talent, drastically shortening screening pipelines.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                AI Mock Interviews
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Job seekers can practice real-time technical and situational interviews with our AI coach, receiving actionable feedback on answer clarity, technical depth, and presentation.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Verified Employers
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Every employer on Hirely undergoes manual administrative verification and AI document review before posting jobs, ensuring job seekers interact only with authentic companies.
              </p>
            </Card>
          </div>
        </section>

        {/* SECTION 3: TRUST & COMPLIANCE */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                3. Built for Scale & Enterprise Trust
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Data security, transparent operations, and responsive support
              </p>
            </div>
          </div>

          <Card className="p-6 md:p-8 space-y-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            <p>
              Hirely enforces rigorous security standards. All user session tokens use secure <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">httpOnly</code> cookies, candidate resume assets are securely stored on encrypted media providers, and personal data is never sold to third parties.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>Zero selling of personal data</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>Encrypted credential storage</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>Direct Admin Support Integration</span>
              </div>
            </div>
          </Card>
        </section>

        {/* CTA SECTION */}
        <section className="bg-zinc-900 text-white dark:bg-zinc-900 rounded-3xl p-8 md:p-12 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to experience the future of recruitment?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            Join thousands of candidates and verified employers building the tech ecosystem across Pakistan.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/jobs">
              <Button variant="primary" size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100 font-bold px-8">
                <Briefcase className="w-4 h-4 mr-2" />
                Explore Open Jobs
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="secondary" size="lg" className="bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700 font-bold px-8">
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
