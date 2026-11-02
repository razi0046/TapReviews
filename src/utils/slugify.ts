/**
 * Pure utility functions for slug generation, UUIDs, URL validation, and path parsing.
 */

export function generateSlug(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[\s_]+/g, '-') // collapse whitespace and underscores to dashes
    .replace(/[^a-z0-9-]/g, '') // remove invalid chars
    .replace(/-+/g, '-') // collapse consecutive dashes
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function parseReviewPath(pathname: string): { slug: string; uuid: string } | null {
  if (!pathname) return null;
  // Expected formats: /r/:slug/:uuid or /r/:slug/:uuid/
  const match = pathname.match(/^\/r\/([^/]+)\/([a-f0-9-]{36})\/?$/i);
  if (!match) return null;
  return {
    slug: match[1],
    uuid: match[2].toLowerCase(),
  };
}

export interface ParsedBusinessRoute {
  identifier: string;
  slug?: string;
  uuid?: string;
}

/**
 * Parses public customer business review routes.
 * Supports:
 * - Permanent canonical routes: /business/:slug
 * - Direct UUID routes: /business/:uuid
 * - Compound routes: /business/:slug/:uuid
 * - Legacy NFC / QR routes: /r/:slug/:uuid
 */
export function parsePublicBusinessRoute(pathname: string): ParsedBusinessRoute | null {
  if (!pathname) return null;
  const clean = pathname.trim();

  // Check /business/:slug/:uuid or /r/:slug/:uuid
  const compoundMatch = clean.match(/^\/(?:business|r)\/([^/]+)\/([a-f0-9-]{36})\/?$/i);
  if (compoundMatch) {
    return {
      slug: compoundMatch[1],
      uuid: compoundMatch[2].toLowerCase(),
      identifier: compoundMatch[2].toLowerCase(),
    };
  }

  // Check canonical /business/:slug or /business/:uuid
  const businessMatch = clean.match(/^\/business\/([^/]+)\/?$/i);
  if (businessMatch) {
    const raw = businessMatch[1].trim();
    if (!raw) return null;
    const isUuid = isValidUuid(raw);
    return {
      identifier: raw,
      slug: isUuid ? undefined : raw.toLowerCase(),
      uuid: isUuid ? raw.toLowerCase() : undefined,
    };
  }

  // Fallback to legacy /r/:slug/:uuid
  const legacy = parseReviewPath(clean);
  if (legacy) {
    return {
      slug: legacy.slug,
      uuid: legacy.uuid,
      identifier: legacy.uuid,
    };
  }

  return null;
}

export function isValidUuid(uuid: string): boolean {
  if (!uuid) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

export function validateGoogleReviewUrl(url: string): { isValid: boolean; normalized: string } {
  if (!url) return { isValid: false, normalized: '' };
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const isGoogle = parsed.hostname.includes('google.') || 
                     parsed.hostname.includes('goo.gl') || 
                     parsed.hostname.includes('g.page');
    return {
      isValid: parsed.protocol.startsWith('http') && isGoogle,
      normalized: trimmed,
    };
  } catch {
    return { isValid: false, normalized: trimmed };
  }
}

export function getCharacterCountFeedback(text: string, max: number = 1000): {
  count: number;
  remaining: number;
  isValid: boolean;
  isNearLimit: boolean;
} {
  const count = text ? text.length : 0;
  return {
    count,
    remaining: Math.max(0, max - count),
    isValid: count <= max,
    isNearLimit: count > max * 0.9,
  };
}
