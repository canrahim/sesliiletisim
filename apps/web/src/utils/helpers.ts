import { API_BASE } from './constants';
import { ParsedMessage } from '../types';

// File URL resolver
export const resolveFileUrl = (url: string): string => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  const normalizedUrl = url.replace('/api/uploads/', '/api/upload/uploads/');
  return `${API_BASE}${normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`}`;
};

// Message content parser
export const parseMessageContent = (raw: string): ParsedMessage => {
  if (!raw) {
    return { type: 'text', text: '' };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.type === 'file' && parsed.filename && parsed.url) {
      return {
        type: 'file',
        filename: parsed.filename,
        url: parsed.url,
        mimetype: parsed.mimetype,
        size: parsed.size,
        text: typeof parsed.text === 'string' ? parsed.text : null,
      };
    }
  } catch (error) {
    // Plain text message
  }

  return { type: 'text', text: raw };
};

// File size formatter
export const formatFileSize = (bytes?: number): string => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '';
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const size = bytes / Math.pow(1024, exponent);
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

// File download handler
export const handleDownloadFile = async (url: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (error) {
    console.error('❌ Download error:', error);
    throw error;
  }
};

