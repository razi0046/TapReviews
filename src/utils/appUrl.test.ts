import test from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import {
  isLocalOrPrivateHost,
  normalizeBaseUrl,
  getAppBaseUrl,
  getBusinessCanonicalUrl,
  getBusinessLegacyUrl,
  generateHighResQrCode,
} from './appUrl';
import { parsePublicBusinessRoute, parseReviewPath } from './slugify';
import { businessService } from '../services/businessService';

test('isLocalOrPrivateHost accurately identifies local and private hostnames', () => {
  // Local and loopback
  assert.equal(isLocalOrPrivateHost('http://localhost:3000'), true);
  assert.equal(isLocalOrPrivateHost('https://localhost'), true);
  assert.equal(isLocalOrPrivateHost('http://127.0.0.1:8080'), true);
  assert.equal(isLocalOrPrivateHost('http://0.0.0.0:3000'), true);
  assert.equal(isLocalOrPrivateHost('http://192.168.1.150:3000'), true);
  assert.equal(isLocalOrPrivateHost('http://10.0.0.5'), true);
  assert.equal(isLocalOrPrivateHost('http://172.20.0.1:3000'), true);
  assert.equal(isLocalOrPrivateHost('http://my-macbook.local:3000'), true);

  // Production public domains
  assert.equal(isLocalOrPrivateHost('https://tapreviews.vercel.app'), false);
  assert.equal(isLocalOrPrivateHost('https://mybusinessreviews.com'), false);
  assert.equal(isLocalOrPrivateHost('https://review.company.in'), false);
});

test('normalizeBaseUrl trims trailing slashes and spaces', () => {
  assert.equal(normalizeBaseUrl('https://example.com/'), 'https://example.com');
  assert.equal(normalizeBaseUrl('https://example.com///'), 'https://example.com');
  assert.equal(normalizeBaseUrl('  https://example.com  '), 'https://example.com');
});

test('getAppBaseUrl returns a production public domain and never localhost', () => {
  const baseUrl = getAppBaseUrl();
  assert.ok(baseUrl.startsWith('http'));
  assert.equal(isLocalOrPrivateHost(baseUrl), false);
  assert.ok(!baseUrl.includes('localhost'));
  assert.ok(!baseUrl.includes('127.0.0.1'));
});

test('getBusinessCanonicalUrl constructs permanent public URL', () => {
  const urlFromSlug = getBusinessCanonicalUrl('royal-biryani');
  assert.ok(urlFromSlug.includes('/business/royal-biryani'));
  assert.ok(urlFromSlug.startsWith('http'));
  assert.equal(isLocalOrPrivateHost(urlFromSlug), false);

  const urlFromObject = getBusinessCanonicalUrl({
    slug: 'cafe-chai-bloom',
    id: '3c8e1a72-6b94-4d10-8f29-1a2b3c4d5e6f',
  });
  assert.ok(urlFromObject.includes('/business/cafe-chai-bloom'));
  assert.equal(isLocalOrPrivateHost(urlFromObject), false);
});

test('getBusinessLegacyUrl constructs valid legacy URL for backward compatibility', () => {
  const legacy = getBusinessLegacyUrl('royal-biryani', '8f3a2c91-7d45-4e2b-a631-9c8d12345678');
  assert.ok(legacy.includes('/r/royal-biryani/8f3a2c91-7d45-4e2b-a631-9c8d12345678'));
});

test('generateHighResQrCode creates a >= 1024x1024 PNG decodable to the exact canonical URL', async () => {
  const canonicalUrl = getBusinessCanonicalUrl('royal-biryani');
  const dataUrl = await generateHighResQrCode(canonicalUrl, {
    width: 1024,
    margin: 4,
    errorCorrectionLevel: 'H',
  });

  assert.ok(dataUrl.startsWith('data:image/png;base64,'));

  // Decode PNG dimensions
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const parsedPng = PNG.sync.read(imageBuffer);

  assert.equal(parsedPng.width, 1024);
  assert.equal(parsedPng.height, 1024);

  // Decode QR code content using jsQR
  const decoded = jsQR(new Uint8ClampedArray(parsedPng.data), parsedPng.width, parsedPng.height);
  assert.ok(decoded, 'QR code was successfully decoded by jsQR');
  assert.equal(decoded.data, canonicalUrl, 'Decoded QR text exactly matches canonical URL');
});

test('parsePublicBusinessRoute correctly parses canonical and legacy public review paths', () => {
  // Canonical /business/:slug
  const route1 = parsePublicBusinessRoute('/business/royal-biryani');
  assert.ok(route1);
  assert.equal(route1.identifier, 'royal-biryani');
  assert.equal(route1.slug, 'royal-biryani');
  assert.equal(route1.uuid, undefined);

  // Canonical /business/:slug with trailing slash
  const route1Slash = parsePublicBusinessRoute('/business/royal-biryani/');
  assert.ok(route1Slash);
  assert.equal(route1Slash.slug, 'royal-biryani');

  // Direct UUID /business/:uuid
  const testUuid = '8f3a2c91-7d45-4e2b-a631-9c8d12345678';
  const route2 = parsePublicBusinessRoute(`/business/${testUuid}`);
  assert.ok(route2);
  assert.equal(route2.identifier, testUuid);
  assert.equal(route2.uuid, testUuid);

  // Compound /business/:slug/:uuid
  const route3 = parsePublicBusinessRoute(`/business/royal-biryani/${testUuid}`);
  assert.ok(route3);
  assert.equal(route3.slug, 'royal-biryani');
  assert.equal(route3.uuid, testUuid);

  // Legacy /r/:slug/:uuid
  const routeLegacy = parsePublicBusinessRoute(`/r/royal-biryani/${testUuid}`);
  assert.ok(routeLegacy);
  assert.equal(routeLegacy.slug, 'royal-biryani');
  assert.equal(routeLegacy.uuid, testUuid);

  // Invalid routes
  assert.equal(parsePublicBusinessRoute('/'), null);
  assert.equal(parsePublicBusinessRoute('/admin'), null);
  assert.equal(parsePublicBusinessRoute('/something/else'), null);
});

test('businessService retrieves business by slug and identifier', async () => {
  // Retrieve by slug
  const bySlug = await businessService.getBusinessBySlug('royal-biryani');
  assert.ok(bySlug);
  assert.equal(bySlug.slug, 'royal-biryani');
  assert.equal(bySlug.business_name, 'Royal Biryani House');

  // Retrieve by identifier (UUID)
  const byId = await businessService.getBusinessByIdentifier('8f3a2c91-7d45-4e2b-a631-9c8d12345678');
  assert.ok(byId);
  assert.equal(byId.id, '8f3a2c91-7d45-4e2b-a631-9c8d12345678');

  // Non-existent identifier
  const nonExistent = await businessService.getBusinessByIdentifier('non-existent-business-xyz');
  assert.equal(nonExistent, null);
});
