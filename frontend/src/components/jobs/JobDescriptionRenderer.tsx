import React from 'react';

interface JobDescriptionRendererProps {
  description: string;
  className?: string;
}

/**
 * Gracefully renders job descriptions:
 * - HTML rich-text for new Tiptap descriptions (sanitized by backend).
 * - Plain text fallback with line-break preservation for legacy jobs.
 */
export function JobDescriptionRenderer({ description, className = '' }: JobDescriptionRendererProps) {
  if (!description) {
    return <p className="text-sm text-zinc-500 italic">No description provided.</p>;
  }

  // Detect if description is HTML or plain text
  const isHtml = /<[a-z][\s\S]*>/i.test(description);

  if (isHtml) {
    return (
      <div
        className={`prose prose-zinc dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed 
          [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 
          [&_li]:mb-1 [&_strong]:font-extrabold [&_strong]:text-zinc-900 dark:[&_strong]:text-zinc-100 
          [&_em]:italic [&_h1]:text-lg [&_h1]:font-extrabold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1
          [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-400 [&_blockquote]:pl-3 [&_blockquote]:italic ${className}`}
        dangerouslySetInnerHTML={{ __html: description }}
      />
    );
  }

  // Legacy plain-text fallback: preserve newlines
  return (
    <div className={`text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line font-normal ${className}`}>
      {description}
    </div>
  );
}
