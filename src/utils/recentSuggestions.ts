import { SatisfactionLevel } from '../types';

export const RECENT_SUGGESTIONS_KEY_PREFIX = 'nfc_review_recent_suggestion_ids';
export const MAX_RECENT_SUGGESTIONS = 5;

/**
 * Construct a scoped storage key for recent suggestions per business and satisfaction level.
 * Never stores credentials or sensitive information.
 */
export function getRecentSuggestionStorageKey(businessId: string, level: SatisfactionLevel): string {
  const safeBusinessId = (businessId || 'default').trim().toLowerCase();
  return `${RECENT_SUGGESTIONS_KEY_PREFIX}:${safeBusinessId}:${level}`;
}

/**
 * Retrieve the last displayed suggestion IDs (up to 5) for a given business and satisfaction level.
 * Falls back safely to empty array if storage is empty or unavailable.
 */
export function getRecentSuggestionIds(businessId: string, level: SatisfactionLevel): string[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getRecentSuggestionStorageKey(businessId, level));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, MAX_RECENT_SUGGESTIONS);
  } catch (err) {
    console.warn('Failed reading recent suggestions from storage:', err);
    return [];
  }
}

/**
 * Record a displayed suggestion ID in browser storage.
 * Maintains a rolling FIFO list of up to 5 IDs to prevent immediate repeats on the same device.
 */
export function recordDisplayedSuggestionId(
  businessId: string,
  level: SatisfactionLevel,
  suggestionId: string
): void {
  if (typeof window === 'undefined' || !window.localStorage || !suggestionId) {
    return;
  }

  const cleanId = suggestionId.trim();
  if (!cleanId) return;

  try {
    const current = getRecentSuggestionIds(businessId, level);
    // Move to front if repeated, deduplicate, and limit to MAX_RECENT_SUGGESTIONS (5)
    const updated = [cleanId, ...current.filter((id) => id !== cleanId)].slice(
      0,
      MAX_RECENT_SUGGESTIONS
    );

    window.localStorage.setItem(
      getRecentSuggestionStorageKey(businessId, level),
      JSON.stringify(updated)
    );
  } catch (err) {
    console.warn('Failed saving displayed suggestion to storage:', err);
  }
}

/**
 * Clear stored suggestions for testing or reset.
 */
export function clearRecentSuggestionIds(businessId?: string, level?: SatisfactionLevel): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    if (businessId && level) {
      window.localStorage.removeItem(getRecentSuggestionStorageKey(businessId, level));
    } else {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(RECENT_SUGGESTIONS_KEY_PREFIX)) {
          if (!businessId || key.includes(`:${businessId.toLowerCase()}:`)) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    }
  } catch (err) {
    console.warn('Failed clearing recent suggestions from storage:', err);
  }
}
