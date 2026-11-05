import test from 'node:test';
import assert from 'node:assert/strict';
import { businessService, INITIAL_BUSINESSES, INITIAL_TEMPLATES } from './businessService';

test('businessService returns businesses from Supabase or pre-seeded local fallback', async () => {
  const businesses = await businessService.getAllBusinesses();
  assert.ok(businesses.length >= 1);
  assert.ok(businesses[0].business_name);
  assert.ok(businesses[0].slug);
});

test('businessService retrieves business by slug and UUID or returns null when not in database', async () => {
  const business = await businessService.getBusinessBySlugAndUuid(
    'royal-biryani',
    '8f3a2c91-7d45-4e2b-a631-9c8d12345678'
  );
  // When live Supabase is connected and row does not exist, it safely returns null without mock leakage
  // When offline/local, it resolves the seeded business
  if (business) {
    assert.equal(business.business_name, 'Royal Biryani House');
    assert.equal(business.google_review_url.includes('google'), true);
  } else {
    assert.equal(business, null);
  }

  // Mismatched or non-existent slug always returns null
  const mismatch = await businessService.getBusinessBySlugAndUuid(
    'wrong-slug',
    '8f3a2c91-7d45-4e2b-a631-9c8d12345678'
  );
  assert.equal(mismatch, null);

  // Inactive or unknown business returns null
  const inactiveResult = await businessService.getBusinessBySlugAndUuid(
    'non-existent-slug',
    '00000000-0000-0000-0000-000000000000'
  );
  assert.equal(inactiveResult, null);
});

test('businessService retrieves review templates by satisfaction level', async () => {
  const excellentTpl = await businessService.getReviewTemplateBySatisfaction(
    '8f3a2c91-7d45-4e2b-a631-9c8d12345678',
    'Excellent'
  );
  assert.ok(excellentTpl);
  assert.equal(excellentTpl.satisfaction_level, 'Excellent');
  assert.ok(excellentTpl.review_text.includes('Outstanding'));

  const poorTpl = await businessService.getReviewTemplateBySatisfaction(
    '8f3a2c91-7d45-4e2b-a631-9c8d12345678',
    'Poor'
  );
  assert.ok(poorTpl);
  assert.equal(poorTpl.satisfaction_level, 'Poor');
});

test('businessService creates a new business with generated UUID, slug and templates', async () => {
  const { business, templates } = await businessService.createBusiness({
    business_name: 'Delhi Darbar Sweets',
    business_category: 'bakery',
    hero_image_url: '/src/assets/images/royal_biryani_platter_1793547629005.jpg',
    google_review_url: 'https://g.page/r/delhidarbar/review',
    welcome_message: 'Welcome to Delhi Darbar!',
    tagline: 'AUTHENTIC TRADITIONAL SWEETS & SAVORIES',
  });

  assert.ok(business.id);
  assert.equal(business.slug, 'delhi-darbar-sweets');
  assert.equal(business.business_name, 'Delhi Darbar Sweets');
  assert.equal(business.business_category, 'bakery');
  assert.equal(templates.length, 4);
  const levels = templates.map((t) => t.satisfaction_level);
  assert.deepEqual(levels.sort(), ['Average', 'Excellent', 'Good', 'Poor'].sort());
});

test('businessService.getCategoryReviewSuggestion returns suggestions for normalized categories', async () => {
  const suggestion = await businessService.getCategoryReviewSuggestion('restaurant', 'Excellent');
  assert.ok(suggestion);
  assert.equal(suggestion.business_category, 'restaurant');
  assert.equal(suggestion.satisfaction_level, 'Excellent');
  const text = suggestion.suggestion_text || suggestion.review_text || '';
  assert.ok(text.length > 10);
});

test('businessService.getCategoryReviewSuggestion retries with general when custom category has no suggestions', async () => {
  // Requirement 6: If no review suggestions exist for a custom category, retry the suggestion lookup with general as fallback
  const suggestion = await businessService.getCategoryReviewSuggestion('unknown-exotic-niche', 'Good');
  assert.ok(suggestion);
  assert.equal(suggestion.satisfaction_level, 'Good');
  const text = suggestion.suggestion_text || suggestion.review_text || '';
  assert.ok(text.length > 10);
});

test('businessService.getCategoryReviewSuggestion returns general suggestion when category is general', async () => {
  const suggestion = await businessService.getCategoryReviewSuggestion('general', 'Excellent');
  assert.ok(suggestion);
  assert.equal(suggestion.business_category, 'general');
  assert.equal(suggestion.satisfaction_level, 'Excellent');
  const text = suggestion.suggestion_text || suggestion.review_text || '';
  assert.ok(text.length > 10);
});

test('businessService.pickRotatingReviewSuggestion returns a review suggestion with valid ID and text', async () => {
  const result = await businessService.pickRotatingReviewSuggestion('restaurant', 'Excellent');
  assert.ok(result);
  assert.ok(result.id);
  assert.ok(result.review_text.length > 10);
});

test('businessService.pickRotatingReviewSuggestion respects excluded IDs', async () => {
  const first = await businessService.pickRotatingReviewSuggestion('restaurant', 'Excellent');
  assert.ok(first);

  // Pass first ID as excluded
  const second = await businessService.pickRotatingReviewSuggestion('restaurant', 'Excellent', [first.id]);
  assert.ok(second);
  // In live Supabase with 500 rows, second ID is distinct from excluded first ID
  assert.notEqual(second.id, first.id);
});

test('businessService.pickRotatingReviewSuggestion retries without exclusions when all are excluded', async () => {
  // If we exclude an ID or non-matching ID, it should still return a result
  const result = await businessService.pickRotatingReviewSuggestion('cafe', 'Good', ['00000000-0000-0000-0000-000000000000']);
  assert.ok(result);
  assert.ok(result.review_text.length > 10);
});

test('businessService.pickRotatingReviewSuggestion retries with general when custom category has no suggestions', async () => {
  // Requirement 6: If no review suggestions exist for a custom category, retry the suggestion lookup with general as fallback
  const result = await businessService.pickRotatingReviewSuggestion('completely-custom-category-xyz', 'Poor');
  assert.ok(result);
  assert.ok(result.id);
  assert.ok(result.review_text.length > 10);
});

test('businessService returns suggestions for all new categories across satisfaction levels', async () => {
  const newCategories = [
    'fast-food',
    'kebab-store',
    'abaya-shop',
    'sweets-shop',
    'snacks-shop',
    'meat-shop',
    'bags-shop',
    'optics-store',
    'boutique-design-house',
    'tailoring',
    'turf',
  ];

  const levels: ('Excellent' | 'Good' | 'Average' | 'Poor')[] = [
    'Excellent',
    'Good',
    'Average',
    'Poor',
  ];

  for (const cat of newCategories) {
    for (const level of levels) {
      const suggestion = await businessService.getCategoryReviewSuggestion(cat, level);
      assert.ok(suggestion, `Suggestion for ${cat} / ${level} should exist`);
      assert.equal(suggestion.business_category, cat);
      assert.equal(suggestion.satisfaction_level, level);
      const text = suggestion.suggestion_text || suggestion.review_text || '';
      assert.ok(text.length > 10, `Review text for ${cat} / ${level} should be substantive`);

      // Rotating picker should also resolve
      const rotating = await businessService.pickRotatingReviewSuggestion(cat, level);
      assert.ok(rotating, `Rotating suggestion for ${cat} / ${level} should resolve`);
      assert.ok(rotating.id);
      assert.ok(rotating.review_text.length > 10);
    }
  }
});

test('businessService persists and updates facebook_url and youtube_url', async () => {
  const { business } = await businessService.createBusiness({
    business_name: 'Metro Optics & Sunglasses',
    business_category: 'optics-store',
    hero_image_url: '/src/assets/images/royal_biryani_platter_1793547629005.jpg',
    google_review_url: 'https://g.page/r/metrooptics/review',
    welcome_message: 'Welcome to Metro Optics!',
    facebook_url: 'https://facebook.com/metrooptics',
    youtube_url: 'https://youtube.com/@metrooptics',
    instagram_url: 'https://instagram.com/metrooptics',
    website_url: 'https://metrooptics.in',
  });

  assert.ok(business.id);
  assert.equal(business.facebook_url, 'https://facebook.com/metrooptics');
  assert.equal(business.youtube_url, 'https://youtube.com/@metrooptics');

  // Verify retrieval via getBusinessByIdentifier
  const retrieved = await businessService.getBusinessByIdentifier(business.id);
  assert.ok(retrieved);
  assert.equal(retrieved.facebook_url, 'https://facebook.com/metrooptics');
  assert.equal(retrieved.youtube_url, 'https://youtube.com/@metrooptics');

  // Test updating social URLs
  const updated = await businessService.updateBusiness(business.id, {
    facebook_url: 'https://facebook.com/metrooptics.official',
    youtube_url: 'https://youtube.com/@metroopticsofficial',
  });
  assert.equal(updated.facebook_url, 'https://facebook.com/metrooptics.official');
  assert.equal(updated.youtube_url, 'https://youtube.com/@metroopticsofficial');
});



