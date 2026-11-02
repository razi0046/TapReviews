import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateImageFile,
  getFileExtension,
  generateStoragePath,
  extractStoragePath,
  isSupabaseStorageUrl,
  deleteOldBusinessImageIfInBucket,
  MAX_FILE_SIZE_BYTES,
} from './imageStorageService';

// Mock File implementation for Node test environment if not available globally
class MockFile {
  name: string;
  type: string;
  size: number;
  constructor(name: string, type: string, size: number) {
    this.name = name;
    this.type = type;
    this.size = size;
  }
}

test('imageStorageService: validateImageFile accepts valid JPEG, PNG, and WebP within 5MB', () => {
  const validJpeg = new MockFile('photo.jpg', 'image/jpeg', 1024 * 500) as unknown as File;
  const validPng = new MockFile('banner.png', 'image/png', 1024 * 1024 * 2) as unknown as File;
  const validWebp = new MockFile('logo.webp', 'image/webp', 1024 * 300) as unknown as File;

  assert.equal(validateImageFile(validJpeg).isValid, true);
  assert.equal(validateImageFile(validPng).isValid, true);
  assert.equal(validateImageFile(validWebp).isValid, true);
});

test('imageStorageService: validateImageFile rejects files exceeding 5MB', () => {
  const oversizedFile = new MockFile(
    'huge.jpg',
    'image/jpeg',
    MAX_FILE_SIZE_BYTES + 1024
  ) as unknown as File;

  const result = validateImageFile(oversizedFile);
  assert.equal(result.isValid, false);
  assert.ok(result.error?.includes('exceeds the 5 MB maximum limit'));
});

test('imageStorageService: validateImageFile rejects disallowed formats (e.g. gif, pdf, svg)', () => {
  const gifFile = new MockFile('animation.gif', 'image/gif', 1024 * 100) as unknown as File;
  const pdfFile = new MockFile('document.pdf', 'application/pdf', 1024 * 200) as unknown as File;
  const svgFile = new MockFile('icon.svg', 'image/svg+xml', 1024 * 50) as unknown as File;

  assert.equal(validateImageFile(gifFile).isValid, false);
  assert.equal(validateImageFile(pdfFile).isValid, false);
  assert.equal(validateImageFile(svgFile).isValid, false);
});

test('imageStorageService: getFileExtension correctly normalizes extensions', () => {
  assert.equal(getFileExtension(new MockFile('test.JPG', 'image/jpeg', 100) as unknown as File), 'jpg');
  assert.equal(getFileExtension(new MockFile('test.jpeg', 'image/jpeg', 100) as unknown as File), 'jpg');
  assert.equal(getFileExtension(new MockFile('test.png', 'image/png', 100) as unknown as File), 'png');
  assert.equal(getFileExtension(new MockFile('test.webp', 'image/webp', 100) as unknown as File), 'webp');
});

test('imageStorageService: generateStoragePath creates valid path pattern <business-id>/<uuid>.<ext>', () => {
  const businessId = '8f3a2c91-7d45-4e2b-a631-9c8d12345678';
  const file = new MockFile('storefront.jpeg', 'image/jpeg', 500) as unknown as File;
  const path = generateStoragePath(businessId, file);

  assert.ok(path.startsWith(`${businessId}/`));
  assert.ok(path.endsWith('.jpg'));
  const parts = path.split('/');
  assert.equal(parts.length, 2);
  assert.equal(parts[0], businessId);
  // Second part should be a uuid + .jpg
  const filename = parts[1];
  assert.ok(filename.includes('.jpg'));
  assert.ok(filename.length > 30);
});

test('imageStorageService: extractStoragePath identifies business-images URLs only', () => {
  const supabaseUrl =
    'https://gzgfsuamixaeqlyxzatr.supabase.co/storage/v1/object/public/business-images/8f3a2c91-7d45-4e2b-a631-9c8d12345678/abc-123.jpg';
  const extracted = extractStoragePath(supabaseUrl);
  assert.equal(extracted, '8f3a2c91-7d45-4e2b-a631-9c8d12345678/abc-123.jpg');
  assert.equal(isSupabaseStorageUrl(supabaseUrl), true);

  // Local sample asset - must return null
  const localUrl = '/src/assets/images/royal_biryani_platter_1793547629005.jpg';
  assert.equal(extractStoragePath(localUrl), null);
  assert.equal(isSupabaseStorageUrl(localUrl), false);

  // External URL - must return null
  const externalUrl = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4';
  assert.equal(extractStoragePath(externalUrl), null);
  assert.equal(isSupabaseStorageUrl(externalUrl), false);
});

test('imageStorageService: deleteOldBusinessImageIfInBucket skips non-bucket URLs', async () => {
  const localUrl = '/src/assets/images/royal_biryani_platter_1793547629005.jpg';
  const result = await deleteOldBusinessImageIfInBucket(localUrl);
  assert.equal(result, false);

  const extUrl = 'https://example.com/photo.jpg';
  const extResult = await deleteOldBusinessImageIfInBucket(extUrl);
  assert.equal(extResult, false);
});
