'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { api } from '@/lib/api';
import { formatSalaryRange, formatWorkplaceType } from '@/utils/formatters';
import {
  Bot,
  Sparkles,
  X,
  Send,
  RotateCcw,
  Building2,
  MapPin,
  Briefcase,
  ExternalLink,
  User,
  CheckCircle2,
  Filter,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface JobResultCard {
  _id: string;
  title: string;
  category?: string;
  jobType?: string;
  location?: string;
  workplaceType?: string;
  payShowBy?: string;
  payRate?: string;
  salaryCurrency?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryDisclosed?: boolean;
  companyId?: {
    companyName: string;
    logoUrl?: string;
    isVerified?: boolean;
  };
}

interface CandidateResultCard {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  location?: string;
  skills: string[];
  experienceLevel: string;
  bio?: string;
  hasAppliedToEmployer?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  jobs?: JobResultCard[];
  candidates?: CandidateResultCard[];
  filtersUsed?: Record<string, any>;
  timestamp: string;
}

interface AIAssistantWidgetProps {
  mode: 'job_seeker' | 'employer' | 'admin';
}

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({ mode }) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Client-side portal mounting flag
  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide widget on active test or interview sessions to prevent obstruction
  const isSpecialPage =
    (pathname.includes('/skill-tests/') && pathname !== '/dashboard/skill-tests') ||
    (pathname.includes('/mock-interview/') && pathname !== '/dashboard/mock-interview');

  // Welcome message initialization
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        sender: 'assistant',
        text:
          mode === 'job_seeker'
            ? 'Welcome to Hirely AI Assistant. I can search active job requisitions by role, location, salary, or experience level.'
            : mode === 'employer'
            ? 'Welcome to Hirely AI Talent Assistant. I can search candidates by skills, domain experience, location, or seniority.'
            : 'Welcome to Hirely Admin Intelligence. Ask me anything about live platform metrics, signups, job trends, verifications, or revenue.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([welcomeMsg]);
    }
  }, [mode, messages.length]);

  // GSAP animation when panel opens
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReducedMotion) {
        gsap.fromTo(
          panelRef.current,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }
        );
      }
    }
  }, [isOpen]);

  // Scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const userText = (textToSend || inputValue).trim();
    if (!userText || isLoading) return;

    const userMsgObj: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsgObj]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyContext = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ sender: m.sender, text: m.text }));

      const endpoint =
        mode === 'job_seeker'
          ? '/assistant/job-seeker/chat'
          : mode === 'employer'
          ? '/assistant/employer/chat'
          : '/admin/assistant/chat';

      const res = await api.post(endpoint, {
        message: userText,
        conversationHistory: historyContext,
      });

      if (res.data?.success) {
        const assistantMsgObj: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: res.data.responseText || 'Here are the matching results from our database:',
          jobs: res.data.jobs || [],
          candidates: res.data.candidates || [],
          filtersUsed: res.data.filtersUsed || undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsgObj]);
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message ||
        (err as Error).message ||
        'An error occurred while querying database results.';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `Unable to complete query: ${errorMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  if (isSpecialPage || !mounted) return null;

  const jobSeekerPrompts = [
    'Find remote jobs for me',
    'Show jobs posted today',
    'Find jobs matching my skills',
    'Show high-paying jobs',
  ];

  const employerPrompts = [
    'Find React developers',
    'Show candidates in Karachi',
    'Find candidates with 3+ years experience',
  ];

  const adminPrompts = [
    'How many verification requests were rejected last week?',
    'Which job got the most applications?',
    'How many new employers signed up this month?',
    'What is our verified vs unverified company ratio?',
  ];

  const currentPrompts =
    mode === 'job_seeker' ? jobSeekerPrompts : mode === 'employer' ? employerPrompts : adminPrompts;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {/* FLOATING ACTION BUTTON (Icon only by default, expands text on hover) */}
      {!isOpen && (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(true)}
          title={
            mode === 'job_seeker'
              ? 'AI Job Assistant'
              : mode === 'employer'
              ? 'AI Talent Assistant'
              : 'Admin AI Intelligence'
          }
          aria-label="Open Hirely AI Assistant"
          className="group relative h-12 w-12 hover:w-auto p-0 hover:px-4 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-0 group-hover:gap-2.5 overflow-hidden select-none outline-none focus:outline-none focus:ring-0"
        >
          <div className="w-7 h-7 rounded-full bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold tracking-tight hidden group-hover:inline-block transition-all duration-300 whitespace-nowrap">
            {mode === 'job_seeker'
              ? 'AI Job Assistant'
              : mode === 'employer'
              ? 'AI Talent Assistant'
              : 'Admin AI Intelligence'}
          </span>
        </button>
      )}

      {/* FLOATING CHAT PANEL */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 w-full h-full sm:w-[420px] sm:h-[600px] sm:max-h-[85vh] rounded-none sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 z-[9999] font-sans"
        >
          {/* HEADER */}
          <div className="px-4 py-3.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-subtle">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>Hirely AI Assistant</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    Live Data
                  </span>
                </h3>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-normal">
                  Your intelligent {mode === 'job_seeker' ? 'job search' : 'candidate search'} companion
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear conversation"
                aria-label="Clear conversation"
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close AI Assistant"
                aria-label="Close AI Assistant"
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CHAT MESSAGES STREAM */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs no-scrollbar overscroll-contain">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl space-y-2.5 ${
                    msg.sender === 'user'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-none font-medium shadow-subtle'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 rounded-tl-none shadow-subtle'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {/* Filter Badges if returned */}
                  {msg.filtersUsed && Object.keys(msg.filtersUsed).length > 0 && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/60 flex flex-wrap items-center gap-1 text-[10px]">
                      <span className="text-zinc-400 font-bold mr-1">Search criteria:</span>
                      {Object.entries(msg.filtersUsed).map(([key, val]) => {
                        if (!val || (Array.isArray(val) && val.length === 0)) return null;
                        const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
                        return (
                          <span
                            key={key}
                            className="px-2 py-0.5 rounded-full font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600 capitalize"
                          >
                            {key}: {displayVal}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Compact Job Result Cards */}
                  {msg.jobs && msg.jobs.length > 0 && (
                    <div className="pt-2 space-y-2 border-t border-zinc-200 dark:border-zinc-700/60">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Matching Requisitions ({msg.jobs.length})
                      </span>

                      {msg.jobs.map((job) => (
                        <div
                          key={job._id}
                          className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors shadow-subtle"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs line-clamp-1">
                              {job.title}
                            </span>
                            {job.jobType && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 capitalize shrink-0">
                                {Array.isArray(job.jobType)
                                  ? job.jobType.map((t: string) => String(t).replace(/_/g, ' ')).join(', ')
                                  : String(job.jobType || 'full_time').replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span className="flex items-center gap-1 font-medium truncate">
                              <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="truncate">{job.companyId?.companyName || 'Employer'}</span>
                              {job.companyId?.isVerified && (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              )}
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              <MapPin className="w-3 h-3 text-zinc-400" />
                              <span>{job.location}</span>
                            </span>
                          </div>

                          <div className="pt-1 flex items-center justify-between text-[11px] border-t border-zinc-100 dark:border-zinc-800">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatSalaryRange(job)}
                            </span>

                            <Link
                              href={`/jobs/${job._id}`}
                              onClick={() => setIsOpen(false)}
                              className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
                            >
                              <span>View Job</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Compact Candidate Result Cards */}
                  {msg.candidates && msg.candidates.length > 0 && (
                    <div className="pt-2 space-y-2 border-t border-zinc-200 dark:border-zinc-700/60">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        Matching Candidates ({msg.candidates.length})
                      </span>

                      {msg.candidates.map((cand) => (
                        <div
                          key={cand.userId}
                          className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors shadow-subtle"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{cand.fullName}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 capitalize">
                              {cand.experienceLevel} Level
                            </span>
                          </div>

                          {cand.skills && cand.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {cand.skills.slice(0, 4).map((sk) => (
                                <span
                                  key={sk}
                                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="pt-1 flex items-center justify-between text-[11px] border-t border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500">{cand.location || 'Location Not Specified'}</span>

                            <Link
                              href={`/dashboard/candidates`}
                              onClick={() => setIsOpen(false)}
                              className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
                            >
                              <span>View Candidates</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 px-1 font-medium">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Empty State Prompt Suggestions */}
            {messages.length <= 1 && (
              <div className="pt-2 space-y-2">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block">
                  Suggested Queries:
                </span>
                <div className="flex flex-col gap-1.5">
                  {currentPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-left text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors flex items-center justify-between group"
                    >
                      <span>"{prompt}"</span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 max-w-[200px] shadow-subtle">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 animate-pulse delay-150" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 animate-pulse delay-300" />
                </div>
                <span>AI is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* FIXED INPUT AREA */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                mode === 'job_seeker'
                  ? 'Ask to find jobs e.g. "remote React jobs"...'
                  : 'Ask to find candidates e.g. "React developers"...'
              }
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
            />

            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              aria-label="Send Message"
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 disabled:opacity-40 text-white font-bold transition-all shadow-subtle shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>,
    document.body
  );
};
