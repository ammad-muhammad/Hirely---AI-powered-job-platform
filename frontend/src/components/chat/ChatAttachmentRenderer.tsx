'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileArchive,
  File,
  Download,
  ExternalLink,
  Eye,
  X,
  Film,
  Music,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { viewPdfFile, downloadPdfFile } from '@/utils/fileHelpers';

export interface ChatAttachmentProps {
  attachmentUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | string | null;
  isSelf?: boolean;
  className?: string;
}

export type DetectedType = 'image' | 'pdf' | 'doc' | 'sheet' | 'archive' | 'video' | 'audio' | 'other';

export function detectAttachmentType(
  url?: string | null,
  fileName?: string | null,
  providedType?: string | null
): DetectedType {
  if (providedType) {
    const lowerType = providedType.toLowerCase();
    if (lowerType.includes('image') || lowerType === 'jpg' || lowerType === 'png') return 'image';
    if (lowerType.includes('pdf')) return 'pdf';
    if (lowerType.includes('video')) return 'video';
    if (lowerType.includes('audio')) return 'audio';
    if (lowerType.includes('sheet') || lowerType.includes('excel') || lowerType === 'xls' || lowerType === 'xlsx' || lowerType === 'csv') return 'sheet';
    if (lowerType.includes('zip') || lowerType.includes('rar') || lowerType.includes('archive')) return 'archive';
    if (lowerType.includes('doc') || lowerType.includes('word') || lowerType.includes('text')) return 'doc';
  }

  const str = (fileName || url || '').toLowerCase();

  // Extension matching
  if (/\.(png|jpe?g|webp|gif|svg|bmp|ico|heic)(\?.*)?$/i.test(str)) return 'image';
  if (/\.pdf(\?.*)?$/i.test(str)) return 'pdf';
  if (/\.(mp4|webm|ogv|mov|mkv|avi|wmv|m4v)(\?.*)?$/i.test(str)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(str)) return 'audio';
  if (/\.(xls|xlsx|csv)(\?.*)?$/i.test(str)) return 'sheet';
  if (/\.(zip|rar|7z|tar|gz)(\?.*)?$/i.test(str)) return 'archive';
  if (/\.(doc|docx|txt|rtf|ppt|pptx)(\?.*)?$/i.test(str)) return 'doc';

  // Cloudinary URL structure
  if (url?.includes('cloudinary.com')) {
    if (url.includes('/video/upload/')) return 'video';
    if (url.includes('/image/upload/') && !url.toLowerCase().endsWith('.pdf')) return 'image';
  }

  return 'other';
}

export function formatFileSize(size?: number | string | null): string | null {
  if (!size) return null;
  if (typeof size === 'string') {
    if (isNaN(Number(size))) return size;
    size = Number(size);
  }
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatAttachmentRenderer({
  attachmentUrl,
  fileName,
  fileType,
  fileSize,
  isSelf = false,
  className,
}: ChatAttachmentProps) {
  const [imageError, setImageError] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [attachmentUrl]);

  // Handle escape key to close lightbox
  useEffect(() => {
    if (!showLightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLightbox(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox]);

  if (!attachmentUrl) return null;

  const detected = detectAttachmentType(attachmentUrl, fileName, fileType);
  const displayFileName = fileName || attachmentUrl.split('/').pop()?.split('?')[0] || 'Attachment';
  const sizeLabel = formatFileSize(fileSize);

  // 1. IMAGE ATTACHMENT
  if (detected === 'image' && !imageError) {
    return (
      <>
        <div className={cn('pt-1.5 space-y-1 font-sans select-none', className)}>
          <div
            onClick={() => setShowLightbox(true)}
            className="group relative cursor-pointer overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950/40 max-w-xs transition-all hover:border-zinc-400 dark:hover:border-zinc-600 shadow-xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachmentUrl}
              alt={displayFileName}
              onError={() => setImageError(true)}
              className="w-full max-h-60 sm:max-h-72 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white text-xs font-extrabold gap-1.5 backdrop-blur-[1px]">
              <Eye className="w-4 h-4" />
              <span>Preview Image</span>
            </div>
          </div>
          {fileName && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block truncate max-w-xs px-0.5">
              {displayFileName}
            </span>
          )}
        </div>

        {/* FULLSCREEN LIGHTBOX PREVIEW MODAL */}
        {showLightbox && (
          <div className="fixed inset-0 z-[99999] bg-black/92 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
            {/* Lightbox Header Bar */}
            <div className="flex items-center justify-between text-white border-b border-zinc-800 pb-3.5 px-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-xs font-bold truncate max-w-xs sm:max-w-md">{displayFileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => viewPdfFile(attachmentUrl, displayFileName)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open Original</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadPdfFile(attachmentUrl, displayFileName)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLightbox(false)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Main Image Display */}
            <div className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden" onClick={() => setShowLightbox(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachmentUrl}
                alt={displayFileName}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[82vh] max-w-[92vw] object-contain rounded-xl shadow-2xl border border-zinc-800/60"
              />
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. VIDEO ATTACHMENT
  if (detected === 'video') {
    return (
      <div className={cn('pt-1.5 space-y-1 max-w-xs sm:max-w-sm font-sans', className)}>
        <video
          src={attachmentUrl}
          controls
          preload="metadata"
          playsInline
          className="w-full max-h-64 rounded-xl bg-black border border-zinc-200 dark:border-zinc-800 object-contain shadow-xs"
        />
        {fileName && (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block truncate px-0.5">
            {displayFileName}
          </span>
        )}
      </div>
    );
  }

  // 3. AUDIO ATTACHMENT
  if (detected === 'audio') {
    return (
      <div className={cn('pt-1.5 space-y-1 max-w-xs font-sans', className)}>
        <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
          <Music className="w-4 h-4 text-zinc-500 shrink-0" />
          <audio src={attachmentUrl} controls preload="metadata" className="w-full h-8" />
        </div>
        {fileName && (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block truncate px-0.5">
            {displayFileName}
          </span>
        )}
      </div>
    );
  }

  // 4. DOCUMENT CARDS (PDF, Word, Excel, ZIP, Other)
  const isPdf = detected === 'pdf';
  const isSheet = detected === 'sheet';
  const isArchive = detected === 'archive';
  const isDoc = detected === 'doc';

  const badgeIcon = isPdf ? (
    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
  ) : isSheet ? (
    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
  ) : isArchive ? (
    <FileArchive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
  ) : isDoc ? (
    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
  ) : (
    <File className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
  );

  const badgeBg = isPdf
    ? 'bg-red-500/15 border-red-500/25'
    : isSheet
    ? 'bg-emerald-500/15 border-emerald-500/25'
    : isArchive
    ? 'bg-amber-500/15 border-amber-500/25'
    : isDoc
    ? 'bg-indigo-500/15 border-indigo-500/25'
    : 'bg-zinc-500/15 border-zinc-500/25';

  const typeLabel = isPdf
    ? 'PDF Document'
    : isSheet
    ? 'Excel Spreadsheet'
    : isArchive
    ? 'Archive File'
    : isDoc
    ? 'Document'
    : 'File Attachment';

  const containerStyle = isSelf
    ? 'bg-zinc-800/90 text-white border-zinc-700 hover:bg-zinc-800'
    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80';

  return (
    <div className={cn('pt-1.5 font-sans', className)}>
      <div
        className={cn(
          'group p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 max-w-xs sm:max-w-sm shadow-xs',
          containerStyle
        )}
      >
        {/* Left Badge Icon */}
        <div className={cn('p-2.5 rounded-xl border shrink-0 flex items-center justify-center', badgeBg)}>
          {badgeIcon}
        </div>

        {/* File Meta Details */}
        <div className="min-w-0 flex-1 text-left">
          <span className="block font-bold text-xs truncate leading-tight tracking-tight">
            {displayFileName}
          </span>
          <span className="text-[10px] font-semibold opacity-70 block mt-0.5 truncate">
            {typeLabel} {sizeLabel ? `• ${sizeLabel}` : ''}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            title="Open / View Attachment"
            onClick={() => viewPdfFile(attachmentUrl, displayFileName)}
            className="p-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Download File"
            onClick={() => downloadPdfFile(attachmentUrl, displayFileName)}
            className="p-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
