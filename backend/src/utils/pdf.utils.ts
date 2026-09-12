import axios from 'axios';
import { extractText } from 'unpdf';
import { logger } from './logger';

export const extractTextFromPdfUrl = async (url: string): Promise<string> => {
  if (!url) {
    throw new Error('No PDF URL provided for text extraction.');
  }

  try {
    logger.info(`[PDF Utils] Extracting PDF text from source: ${url.substring(0, 60)}...`);
    
    let buffer: Uint8Array;

    if (url.startsWith('data:')) {
      // Base64 Data URI
      const base64Data = url.includes(',') ? url.split(',')[1] : url;
      buffer = new Uint8Array(Buffer.from(base64Data, 'base64'));
    } else {
      // HTTP/HTTPS URL
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,application/octet-stream,*/*',
        },
      });

      buffer = new Uint8Array(response.data);
    }

    // Extract text using unpdf
    const { text } = await extractText(buffer);

    const fullText = Array.isArray(text) ? text.join('\n').trim() : String(text || '').trim();

    if (!fullText || fullText.length < 20) {
      throw new Error(
        'The PDF file does not contain readable text (it may be a scanned image). Please paste your resume text manually using the custom text tab.'
      );
    }

    logger.info(`[PDF Utils] Successfully extracted ${fullText.length} characters from PDF.`);
    return fullText;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'PDF processing failed';
    logger.error(`[PDF Utils Error]: ${msg}`);
    throw new Error(
      `Failed to extract text from your resume PDF (${msg}). Please ensure the PDF has readable text or paste your resume text directly.`
    );
  }
};

