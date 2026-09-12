'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sparkles, X, Copy, Check, RefreshCw, ArrowRight, AlertCircle } from 'lucide-react';

interface AICoverLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
  resumeFile?: File | null;
  onUseCoverLetter: (text: string) => void;
}

export const AICoverLetterModal: React.FC<AICoverLetterModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  companyName,
  resumeFile,
  onUseCoverLetter,
}) => {
  const [tone, setTone] = useState<'formal' | 'friendly' | 'confident'>('formal');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      let response;
      if (resumeFile) {
        const formData = new FormData();
        formData.append('jobId', jobId);
        formData.append('tone', tone);
        formData.append('resume', resumeFile);

        response = await api.post('/ai/generate-cover-letter', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await api.post('/ai/generate-cover-letter', {
          jobId,
          tone,
        });
      }

      if (response.data?.success && response.data?.data?.coverLetter) {
        setGeneratedLetter(response.data.data.coverLetter);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate cover letter';
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedLetter) {
      navigator.clipboard.writeText(generatedLetter);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleUse = () => {
    if (generatedLetter) {
      onUseCoverLetter(generatedLetter);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-xl"
        >
          <Card glass className="p-6 relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-glow">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">AI Cover Letter Generator</h2>
                <p className="text-xs text-slate-500">For {jobTitle} at {companyName}</p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!generatedLetter ? (
              <div className="space-y-5 pt-1">
                {/* Tone Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Choose Tone of Voice
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['formal', 'friendly', 'confident'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold capitalize border transition-all ${
                          tone === t
                            ? 'border-brand-600 bg-brand-50/80 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-300">
                  {resumeFile ? (
                    <span>
                      <strong>Selected Resume:</strong> "{resumeFile.name}" (attached in application modal).
                    </span>
                  ) : (
                    <span>
                      AI will extract and match your saved profile resume against this job posting automatically.
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  variant="primary"
                  onClick={handleGenerate}
                  isLoading={isGenerating}
                  className="w-full py-3 font-bold shadow-glow"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span>{isGenerating ? 'Generating Personalized Cover Letter...' : 'Generate Cover Letter'}</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Generated Cover Letter (Editable)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs font-semibold text-brand-600 flex items-center gap-1 hover:underline"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </button>
                </div>

                <textarea
                  rows={10}
                  value={generatedLetter}
                  onChange={(e) => setGeneratedLetter(e.target.value)}
                  className="w-full p-3.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none leading-relaxed no-scrollbar resize-y"
                />

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerate()}
                    isLoading={isGenerating}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
                  </Button>

                  <Button type="button" variant="primary" size="sm" onClick={handleUse} className="font-semibold">
                    <span>Use Cover Letter</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
