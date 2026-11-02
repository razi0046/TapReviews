import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRecentSuggestionStorageKey,
  getRecentSuggestionIds,
  recordDisplayedSuggestionId,
  clearRecentSuggestionIds,
  MAX_RECENT_SUGGESTIONS,
} from './recentSuggestions';

// Mock browser localStorage for Node.js test environment
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }
}

// Attach mock localStorage to global window if running in Node
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {};
}
(globalThis as any).window.localStorage = new MockLocalStorage();

test('getRecentSuggestionStorageKey creates scoped keys', () => {
  const key = getRecentSuggestionStorageKey('biz-123', 'Excellent');
  assert.equal(key, 'nfc_review_recent_suggestion_ids:biz-123:Excellent');
});

test('recordDisplayedSuggestionId maintains rolling list of last 5 unique IDs', () => {
  const bizId = 'biz-rotation-test';
  clearRecentSuggestionIds(bizId, 'Good');

  // Add 1 ID
  recordDisplayedSuggestionId(bizId, 'Good', 'sug-1');
  assert.deepEqual(getRecentSuggestionIds(bizId, 'Good'), ['sug-1']);

  // Add more IDs
  recordDisplayedSuggestionId(bizId, 'Good', 'sug-2');
  recordDisplayedSuggestionId(bizId, 'Good', 'sug-3');
  recordDisplayedSuggestionId(bizId, 'Good', 'sug-4');
  recordDisplayedSuggestionId(bizId, 'Good', 'sug-5');
  assert.equal(getRecentSuggestionIds(bizId, 'Good').length, 5);
  assert.deepEqual(getRecentSuggestionIds(bizId, 'Good'), ['sug-5', 'sug-4', 'sug-3', 'sug-2', 'sug-1']);

  // Add 6th ID -> earliest ('sug-1') dropped
  recordDisplayedSuggestionId(bizId, 'Good', 'sug-6');
  assert.equal(getRecentSuggestionIds(bizId, 'Good').length, 5);
  assert.deepEqual(getRecentSuggestionIds(bizId, 'Good'), ['sug-6', 'sug-5', 'sug-4', 'sug-3', 'sug-2']);

  // Deduplication: re-recording existing ID 'sug-4' moves it to front without duplicates
  recordDisplayedSuggestionId(bizId, 'Good', 'sug-4');
  assert.equal(getRecentSuggestionIds(bizId, 'Good').length, 5);
  assert.deepEqual(getRecentSuggestionIds(bizId, 'Good'), ['sug-4', 'sug-6', 'sug-5', 'sug-3', 'sug-2']);
});

test('recent suggestion IDs are strictly separated per satisfaction level', () => {
  const bizId = 'biz-separated';
  clearRecentSuggestionIds(bizId);

  recordDisplayedSuggestionId(bizId, 'Excellent', 'sug-exc-1');
  recordDisplayedSuggestionId(bizId, 'Poor', 'sug-poor-1');

  assert.deepEqual(getRecentSuggestionIds(bizId, 'Excellent'), ['sug-exc-1']);
  assert.deepEqual(getRecentSuggestionIds(bizId, 'Poor'), ['sug-poor-1']);
  assert.deepEqual(getRecentSuggestionIds(bizId, 'Average'), []);
});
