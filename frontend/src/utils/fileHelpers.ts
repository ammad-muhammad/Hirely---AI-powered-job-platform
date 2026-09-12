/**
 * Helper utility to handle Resume viewing and downloading cleanly across browsers
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function normalizeCloudinaryUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.includes('cloudinary.com') && url.includes('/raw/upload/')) {
    return url.replace('/raw/upload/', '/image/upload/');
  }
  return url;
}

export async function viewPdfFile(url: string | undefined, fileName?: string) {
  if (!url) return;
  const targetUrl = normalizeCloudinaryUrl(url);

  try {
    // 1. Try client-side Blob fetch (instant, native PDF render)
    const response = await fetch(targetUrl);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      const newWin = window.open(blobUrl, '_blank');
      if (newWin) return;
    }
  } catch (err) {
    console.warn('Client-side blob view fallback to proxy route:', err);
  }

  // 2. Fallback to Backend Proxy View route (guarantees application/pdf header)
  const proxyViewUrl = `${BACKEND_URL}/resumes/view?url=${encodeURIComponent(targetUrl)}`;
  window.open(proxyViewUrl, '_blank');
}

export async function downloadPdfFile(url: string | undefined, fileName?: string) {
  if (!url) return;
  const targetUrl = normalizeCloudinaryUrl(url);
  const rawName = fileName ? (fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`) : 'Resume.pdf';

  try {
    // 1. Try client-side Blob fetch (instant forced download with exact filename)
    const response = await fetch(targetUrl);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = rawName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }
  } catch (err) {
    console.warn('Client-side blob download fallback to proxy route:', err);
  }

  // 2. Fallback to Backend Proxy Download route (guarantees attachment disposition with original filename)
  const proxyDownloadUrl = `${BACKEND_URL}/resumes/download?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(rawName)}`;
  const link = document.createElement('a');
  link.href = proxyDownloadUrl;
  link.download = rawName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Backwards-compatible helper aliases for components using direct links or click handlers
export function getResumeViewUrl(url: string | undefined): string {
  if (!url) return '#';
  const targetUrl = normalizeCloudinaryUrl(url);
  return `${BACKEND_URL}/resumes/view?url=${encodeURIComponent(targetUrl)}`;
}

export function getResumeDownloadUrl(url: string | undefined, originalFileName?: string): string {
  if (!url) return '#';
  const targetUrl = normalizeCloudinaryUrl(url);
  const name = originalFileName || 'Resume.pdf';
  return `${BACKEND_URL}/resumes/download?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(name)}`;
}

export function triggerFileDownload(url: string | undefined, fileName?: string) {
  downloadPdfFile(url, fileName);
}
