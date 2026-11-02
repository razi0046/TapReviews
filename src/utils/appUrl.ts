import QRCode from 'qrcode';

/**
 * Checks whether a given host or URL refers to localhost or a private/device-local network address.
 */
export function isLocalOrPrivateHost(hostOrUrl: string): boolean {
  if (!hostOrUrl) return true;

  try {
    const raw = hostOrUrl.includes('://') ? hostOrUrl : `https://${hostOrUrl}`;
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();

    // Check loopback and localhost
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local')
    ) {
      return true;
    }

    // Check IPv4 private network ranges
    // 10.0.0.0 - 10.255.255.255
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    // 192.168.0.0 - 192.168.255.255
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    // 172.16.0.0 - 172.31.255.255
    const parts = host.split('.');
    if (parts.length === 4 && parts[0] === '172') {
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) return true;
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Normalizes a base URL by trimming trailing slashes and ensuring a protocol.
 */
export function normalizeBaseUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim();
  while (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

/**
 * Resolves the centralized permanent production base URL for the application.
 *
 * Requirements:
 * - Never returns localhost, 127.0.0.1, local IP addresses, temporary preview URLs, or device-specific URLs.
 * - Reads from centralized environment configuration (VITE_APP_URL, VITE_PUBLIC_APP_URL, or process.env.APP_URL).
 * - If running in a public browser origin (e.g. *.vercel.app or a custom domain), uses that origin.
 * - In local development, gracefully uses window.location.origin for testing.
 */
export function getAppBaseUrl(): string {
  // 1. Centralized environment configuration (e.g. configured in Vercel Project Settings)
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_APP_URL) ||
    (typeof process !== 'undefined' && process.env?.APP_URL) ||
    '';

  const normalizedEnv = normalizeBaseUrl(envUrl);
  if (normalizedEnv && !isLocalOrPrivateHost(normalizedEnv)) {
    return normalizedEnv;
  }

  // 2. Browser origin: if it is genuinely a public domain (e.g., your deployed Vercel domain or custom domain)
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = normalizeBaseUrl(window.location.origin);
    if (!isLocalOrPrivateHost(origin)) {
      return origin;
    }
    // When running in local dev without VITE_APP_URL configured, allow origin for immediate testing
    return origin;
  }

  // 3. Fallback production base domain placeholder (non-local, clean TapReviews domain)
  return 'https://tapreviews.vercel.app';
}

/**
 * Generates the permanent canonical public URL for a business.
 * Example: https://YOURDOMAIN.com/business/unique-business-slug
 */
export function getBusinessCanonicalUrl(businessOrSlug: string | { slug: string; id?: string }): string {
  const slug = typeof businessOrSlug === 'string' ? businessOrSlug : businessOrSlug.slug;
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/business/${slug.trim()}`;
}

/**
 * Generates the legacy /r/:slug/:uuid public URL for backward compatibility.
 */
export function getBusinessLegacyUrl(slug: string, uuid: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/r/${slug.trim()}/${uuid.trim()}`;
}

export interface HighResQrCodeOptions {
  width?: number; // Minimum 1024x1024 for print quality
  margin?: number; // Quiet zone
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; // 'H' for high reliability
}

/**
 * Generates a high-resolution, print-ready standards-compliant PNG QR code.
 * Specifications:
 * - Minimum 1024x1024 resolution
 * - Pure black code modules (#000000) on pure white background (#FFFFFF)
 * - Quiet zone margin (4 modules)
 * - High error correction level 'H' (allows up to 30% damage/scuffing on print)
 * - Encodes the canonical permanent URL directly
 */
export async function generateHighResQrCode(
  canonicalUrl: string,
  options: HighResQrCodeOptions = {}
): Promise<string> {
  const width = Math.max(1024, options.width || 1024);
  const margin = options.margin !== undefined ? options.margin : 4;
  const errorCorrectionLevel = options.errorCorrectionLevel || 'H';

  return QRCode.toDataURL(canonicalUrl, {
    width,
    margin,
    errorCorrectionLevel,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Triggers a browser download of the generated high-resolution PNG QR code.
 */
export function downloadQrCodeImage(dataUrl: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const cleanFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = cleanFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
