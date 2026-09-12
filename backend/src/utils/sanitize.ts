import sanitizeHtml from 'sanitize-html';

/**
 * Sanitizes HTML content for job description to allow safe formatting tags
 * while stripping out any malicious scripts, event handlers, or unsafe tags.
 */
export const sanitizeJobDescription = (htmlString: string): string => {
  if (!htmlString) return '';

  return sanitizeHtml(htmlString, {
    allowedTags: [
      'p',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'br',
      'hr',
      'blockquote',
      'code',
      'pre',
    ],
    allowedAttributes: {
      '*': ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
};

/**
 * Strips all HTML tags and returns the length of plain text content.
 */
export const getPlainTextLength = (htmlString: string): number => {
  if (!htmlString) return 0;
  const plainText = sanitizeHtml(htmlString, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return plainText.replace(/&nbsp;/g, ' ').trim().length;
};
