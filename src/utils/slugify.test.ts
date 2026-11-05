import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSlug,
  generateUUID,
  parseReviewPath,
  isValidUuid,
  isValidHttpUrl,
  validateGoogleReviewUrl,
  getCharacterCountFeedback,
} from './slugify';

test('generateSlug converts business names to URL-safe slugs', () => {
  assert.equal(generateSlug('Royal Biryani House'), 'royal-biryani-house');
  assert.equal(generateSlug('  Cafe Chai & Bloom!  '), 'cafe-chai-bloom');
  assert.equal(generateSlug('Café Délicieux - Mumbai'), 'cafe-delicieux-mumbai');
  assert.equal(generateSlug('Spice__Symphony--2026'), 'spice-symphony-2026');
  assert.equal(generateSlug(''), '');
});

test('generateUUID generates valid RFC4122 v4 UUIDs', () => {
  const uuid = generateUUID();
  assert.equal(isValidUuid(uuid), true);
  const uuid2 = generateUUID();
  assert.notEqual(uuid, uuid2);
});

test('parseReviewPath parses /r/:slug/:uuid properly', () => {
  const path = '/r/royal-biryani/8f3a2c91-7d45-4e2b-a631-9c8d12345678';
  const result = parseReviewPath(path);
  assert.ok(result);
  assert.equal(result.slug, 'royal-biryani');
  assert.equal(result.uuid, '8f3a2c91-7d45-4e2b-a631-9c8d12345678');

  // Trailing slash
  const pathWithSlash = '/r/royal-biryani/8f3a2c91-7d45-4e2b-a631-9c8d12345678/';
  const resultWithSlash = parseReviewPath(pathWithSlash);
  assert.ok(resultWithSlash);
  assert.equal(resultWithSlash.slug, 'royal-biryani');

  // Invalid path
  assert.equal(parseReviewPath('/invalid'), null);
  assert.equal(parseReviewPath('/r/just-slug'), null);
  assert.equal(parseReviewPath('/r/royal-biryani/not-a-uuid'), null);
});

test('validateGoogleReviewUrl accurately checks Google review destinations', () => {
  assert.equal(
    validateGoogleReviewUrl('https://g.page/r/royalbiryani/review').isValid,
    true
  );
  assert.equal(
    validateGoogleReviewUrl('https://search.google.com/local/writereview?placeid=ChIJ123').isValid,
    true
  );
  assert.equal(
    validateGoogleReviewUrl('https://maps.google.com/?cid=123456').isValid,
    true
  );
  assert.equal(
    validateGoogleReviewUrl('https://otherwebsite.com/review').isValid,
    false
  );
  assert.equal(
    validateGoogleReviewUrl('invalid-url').isValid,
    false
  );
});

test('getCharacterCountFeedback calculates text metrics within limit', () => {
  const text = 'Had an amazing lunch today at Royal Biryani House!';
  const feedback = getCharacterCountFeedback(text, 1000);
  assert.equal(feedback.count, text.length);
  assert.equal(feedback.remaining, 1000 - text.length);
  assert.equal(feedback.isValid, true);
  assert.equal(feedback.isNearLimit, false);

  const longText = 'a'.repeat(1005);
  const feedbackOver = getCharacterCountFeedback(longText, 1000);
  assert.equal(feedbackOver.isValid, false);
  assert.equal(feedbackOver.remaining, 0);
});

test('isValidHttpUrl validates HTTP and HTTPS URLs and rejects invalid formats', () => {
  assert.equal(isValidHttpUrl('https://facebook.com/royalbiryani'), true);
  assert.equal(isValidHttpUrl('http://facebook.com/royalbiryani'), true);
  assert.equal(isValidHttpUrl('https://youtube.com/@royalbiryani'), true);
  assert.equal(isValidHttpUrl('https://youtu.be/xyz123'), true);
  assert.equal(isValidHttpUrl('facebook.com/royalbiryani'), false);
  assert.equal(isValidHttpUrl('javascript:alert(1)'), false);
  assert.equal(isValidHttpUrl(''), false);
  assert.equal(isValidHttpUrl('   '), false);
  assert.equal(isValidHttpUrl(undefined), false);
  assert.equal(isValidHttpUrl(null), false);
});
